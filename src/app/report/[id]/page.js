import mongoose from "mongoose";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, BarChart3, CalendarClock, CheckCircle2, CircleAlert, FileText, Globe2, Lightbulb, MailCheck, RefreshCw, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import SiteFooter from "@/app/_components/SiteFooter";
import SiteHeader from "@/app/_components/SiteHeader";
import { createPageMetadata } from "@/app/seo";
import { connectToDatabase } from "@/lib/db";
import Lead from "@/models/Lead";
import Submission from "@/models/Submission";
import PrintButton from "./PrintButton";
import { ChecksDataTable, PlatformReadinessCards, RecommendationsExplorer, ReportAuditTables, ReportNavigator } from "./ReportExperience";
import styles from "./report.module.css";

export const runtime = "nodejs";

const REPORT_CACHE_TTL = 5 * 60 * 1000;
const reportCache = globalThis.__aiReadinessReportCache || new Map();
globalThis.__aiReadinessReportCache = reportCache;

function Field({ label, value }) {
  return (
    <div className={styles.field}>
      <span>{label}</span>
      <strong>{value || "Not detected"}</strong>
    </div>
  );
}

function SectionTitle({ kicker, title, copy }) {
  return (
    <div className={styles.sectionTitle}>
      <span>{kicker}</span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatScoreLabel(key) {
  if (key === "eeat") return "EEAT";
  return String(key || "").replace(/^\w/, (char) => char.toUpperCase());
}

function getScoreTone(score) {
  const value = Number(score) || 0;
  if (value >= 80) return "strong";
  if (value >= 60) return "watch";
  return "risk";
}

function PlatformCard({ item }) {
  const tone = getScoreTone(item.score);
  const breakdown = Array.isArray(item.breakdown) ? item.breakdown : [];
  const measuredWeight = breakdown.filter((part) => part.measured).reduce((sum, part) => sum + (Number(part.weight) || 0), 0);
  const guidance = {
    crawlability: "Allow the relevant crawler, keep important pages indexable, and resolve sitemap, redirect, canonical, and HTTP failures.",
    contentReadiness: "Publish specific, answer-first content with useful facts, clear headings, FAQs, and strong topic coverage.",
    structuredData: "Add valid page-appropriate JSON-LD, required properties, stable identifiers, and resolved entity relationships.",
    entityConfidence: "Use one consistent brand identity, stable Organization @id, connected entities, and authoritative sameAs profiles.",
    trustEvidence: "Add named experts, credentials, first-party evidence, policies, citations, reviews, and verifiable business details.",
    metadataQuality: "Use unique, relevant titles and descriptions aligned with each page’s H1 and visible topic.",
  };
  return (
    <article className={styles.platformCard}>
      <div className={styles.platformSummary}>
        <div className={styles.platformContent}>
          <span className={styles.platformName}>{item.platform}</span>
          <strong>{item.readinessIndex == null ? "Not measured" : `${item.readinessIndex}/100 internal readiness`}</strong>
          <p className={styles.platformStatus}>{item.crawler || "Platform-specific crawler"}</p>
          <div className={styles.platformMeta}>
            <span>Tier: {item.tier || item.status || "N/A"}</span>
            <span>Confidence: {item.confidence || "low"}</span>
            <span>Coverage: {item.measuredSignals ?? 0}/{item.totalSignals ?? 0}</span>
          </div>
        </div>
        <span className={`${styles.platformTier} ${styles[tone]}`}>{item.tier || item.status || "N/A"}</span>
      </div>
      <details className={styles.platformDetails}>
        <summary>How this index is calculated and what closes the gap</summary>
        <p className={styles.formula}>Formula: Σ(category score × platform weight) ÷ {measuredWeight || 100} measured weight. This is ScanSiteAI’s proprietary readiness index—not an official {item.platform} visibility score.</p>
        <div className={styles.platformBreakdown}>
          {breakdown.map((part) => {
            const contribution = part.measured && measuredWeight ? ((Number(part.score) || 0) * (Number(part.weight) || 0) / measuredWeight) : null;
            const maximum = measuredWeight ? ((Number(part.weight) || 0) * 100 / measuredWeight) : 0;
            const gap = contribution == null ? null : Math.max(0, maximum - contribution);
            return <div key={part.key} className={styles.platformBreakdownRow}>
              <div><strong>{part.label}</strong><span>{part.measured ? `${part.score}/100 · ${part.weight}% weight` : "Not measured"}</span></div>
              <div className={styles.contribution}><strong>{contribution == null ? "N/A" : contribution.toFixed(1)}</strong><span>contribution</span></div>
              <div className={styles.gap}><strong>{gap == null ? "N/A" : `+${gap.toFixed(1)}`}</strong><span>gap to max</span></div>
              <p>{guidance[part.key] || "Improve the underlying measured checks and supporting evidence for this category."}</p>
            </div>;
          })}
        </div>
        <div className={styles.platformSignals}>{(item.signals || []).map((signal) => <div key={signal.label}><span className={signal.status === "pass" ? styles.signalPass : signal.status === "fail" ? styles.signalFail : styles.signalWarning}>{signal.status === "pass" ? "✓" : signal.status === "fail" ? "×" : "!"}</span><p><strong>{signal.label}</strong><small>{signal.evidence}</small></p></div>)}</div>
      </details>
    </article>
  );
}

function RecommendationCard({ item, index }) {
  const gain = Number(item.expectedGain) || 1;
  return (
    <article className={styles.recommendationCard}>
      <div className={styles.recommendationTop}>
        <div className={styles.recommendationIcon}>
          {index === 0 ? <Sparkles size={24} aria-hidden="true" /> : <Lightbulb size={24} aria-hidden="true" />}
        </div>
        <div>
          <span>{index === 0 ? "Highest impact" : `Priority ${index + 1}`}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
        <div className={styles.gainBadge}>
          <strong>+{gain}</strong>
          <span>points</span>
        </div>
      </div>
      <div className={styles.recommendationGrid}>
        <div>
          <CircleAlert size={20} aria-hidden="true" />
          <span>Current status</span>
          <p>{item.currentStatus}</p>
        </div>
        <div>
          <BadgeCheck size={20} aria-hidden="true" />
          <span>Why AI cares</span>
          <p>{item.whyAiCares}</p>
        </div>
        <div>
          <Wrench size={20} aria-hidden="true" />
          <span>How to fix</span>
          <p>{item.howToFix}</p>
        </div>
      </div>
    </article>
  );
}

async function getReportLead(id) {
  const cached = reportCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.lead;

  await connectToDatabase();
  const lead = await Lead.findById(id).lean();
  if (lead) {
    reportCache.set(id, {
      lead,
      expiresAt: Date.now() + REPORT_CACHE_TTL,
    });
  }
  return lead;
}

async function getReportSubmission(id, submissionId) {
  if (!submissionId || !mongoose.Types.ObjectId.isValid(submissionId)) return null;

  await connectToDatabase();
  return Submission.findOne({ _id: submissionId, lead: id }).lean();
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      title: "AI Readiness Report Not Found",
      description: "The requested ScanSiteAI report could not be found.",
      keywords: ["ScanSiteAI report", "AI readiness report not found"],
      robots: { index: false, follow: false },
    };
  }

  const lead = await getReportLead(id);
  if (!lead) {
    return {
      title: "AI Readiness Report Not Found",
      description: "The requested ScanSiteAI report could not be found.",
      keywords: ["ScanSiteAI report", "AI readiness report not found"],
      robots: { index: false, follow: false },
    };
  }

  const website = lead.website || "Website";
  let websiteLabel = "Website";
  try {
    websiteLabel = new URL(website).hostname.replace(/^www\./, "").slice(0, 32) || "Website";
  } catch {
    websiteLabel = String(website).replace(/^https?:\/\//, "").split("/")[0].slice(0, 32) || "Website";
  }
  const score = Number.isFinite(Number(lead.overallScore)) ? `${lead.overallScore}/100` : "available";

  return createPageMetadata({
    title: `${websiteLabel} AI Readiness Report | ScanSiteAI`,
    description: `ScanSiteAI readiness report for ${website}. Overall score ${score}, with AI platform scores, technical checks and prioritized recommendations.`,
    path: `/report/${id}`,
    keywords: ["ScanSiteAI report", `${website} AI readiness report`, "AI platform scores", "technical AI audit"],
    index: false,
    follow: true,
  });
}

export default async function ReportPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const lead = await getReportLead(id);
  if (!lead) notFound();

  const selectedSubmission = await getReportSubmission(id, query?.submission);
  const report = selectedSubmission?.report || lead.report || {};
  const website = selectedSubmission?.website || lead.website;
  const overallScore = selectedSubmission?.overallScore ?? lead.overallScore;
  const wantsCall = selectedSubmission ? selectedSubmission.wantsCall : lead.wantsCall;
  const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
  const platforms = Array.isArray(report.platformScores) ? report.platformScores : [];
  const scoreBreakdown = report.scoreBreakdown || {};
  const diagnosticChecks = Array.isArray(report.siteAudit?.diagnostics?.checks) ? report.siteAudit.diagnostics.checks : [];
  const scannedAt = report.scannedAt ? formatDateTime(report.scannedAt) : "Not available";
  const finalUrl = report.finalUrl || website;

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.topbar}>
        <SiteHeader className="mx-auto w-full" />
        <div className={styles.actions}>
          <Link className={styles.action} href="/"><RefreshCw size={18} aria-hidden="true" />Run New Scan</Link>
          <PrintButton className={styles.action} reportId={id} submissionId={query?.submission || ""} website={website} />
        </div>
      </div>

      <section className={styles.expertBanner}>
        <div>
          <span><Sparkles size={18} aria-hidden="true" />Next best step</span>
          <strong>Talk with a ScanSiteAI expert about these fixes.</strong>
          <p>Review your score, priority recommendations and AI crawler gaps in a focused 15-minute call.</p>
        </div>
        <a href="https://calendly.com/scansiteai-info/15min" target="_blank" rel="noreferrer">
          Talk with expert
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </section>

      <section id="overview" className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.reportBrand}>
            <Image src="/logo.png" alt="ScanSiteAI logo" width={238} height={72} priority />
            <span>Complete AI readiness report</span>
          </div>
          <p className={styles.eyebrow}>ScanSiteAI report</p>
          <h1>AI Website Readiness Report</h1>
          <a className={styles.websiteLink} href={website} target="_blank" rel="noreferrer">
            <Globe2 size={18} aria-hidden="true" />
            {website}
          </a>
          <p className={styles.heroCopy}>
            A client-ready summary of crawler access, answer-engine readability, trust signals, AI platform readiness and prioritized fixes.
          </p>
          <div className={styles.metaStrip}>
            <span><CalendarClock size={18} aria-hidden="true" />{scannedAt}</span>
            <span><MailCheck size={18} aria-hidden="true" />Call requested: {wantsCall ? "Yes" : "No"}</span>
          </div>
        </div>
        <div className={styles.scorePanel}>
          <div className={styles.scoreRing} style={{ "--score": `${Math.min(100, Math.max(0, Number(overallScore) || 0))}%` }}>
            <div>
              <strong>{overallScore}</strong>
              <span>Grade {report.grade || "N/A"}</span>
            </div>
          </div>
          <p>Overall AI readiness score calculated from live scan signals.</p>
        </div>
      </section>

      <section className={styles.grid}>
        <Field label="Grade" value={report.grade} />
        <Field label="Final URL" value={finalUrl} />
        <Field label="Call Requested" value={wantsCall ? "Yes" : "No"} />
        <Field label="Scanned At" value={scannedAt} />
      </section>

      <ReportNavigator recommendationCount={recommendations.length} pageCount={report.siteAudit?.pages?.length || 0} checkCount={diagnosticChecks.length} />

      <section id="platforms" className={`${styles.section} scroll-mt-24`}>
        <SectionTitle
          kicker="Platform readiness"
          title="Estimated Platform Technical Readiness"
          copy="Qualitative proprietary readiness tiers—not official platform ratings, rankings, or citation probabilities."
        />
        <PlatformReadinessCards platforms={platforms} />
      </section>

      <section id="scores" className={`${styles.section} scroll-mt-24`}>
        <SectionTitle
          kicker="Signal breakdown"
          title="Score Breakdown"
          copy="Weighted audit categories used to calculate the report score."
        />
        <div className={styles.bars}>
          {Object.entries(scoreBreakdown).map(([key, value]) => (
            <div key={key}>
              <span>{formatScoreLabel(key)}</span>
              <div><i style={{ width: `${Math.min(100, Math.max(0, Number(value) || 0))}%` }} /></div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section id="checks" className={`${styles.section} scroll-mt-24`}>
        <SectionTitle
          kicker="Complete checklist"
          title={`${diagnosticChecks.length} Individual Signals Across 6 Readiness Categories`}
          copy="The six categories are weighted summary dimensions. The larger number is the total of individual checks performed across all sampled pages, so repeated page-level checks increase the signal count."
        />
        <ChecksDataTable checks={diagnosticChecks} />
      </section>

      <section id="page-audit" className={`${styles.section} scroll-mt-24`}>
        <SectionTitle
          kicker="Page-level evidence"
          title="Crawl Coverage and Metadata"
          copy="Search and paginate the scanned URLs without stretching the report. Switch views to inspect crawl evidence or SEO metadata quality."
        />
        <ReportAuditTables audit={report.siteAudit} />
      </section>

      <section id="recommendations" className={`${styles.section} scroll-mt-24`}>
        <SectionTitle
          kicker="Action plan"
          title="Detailed Recommendations"
          copy="Search or filter the action plan, then expand only the fixes you need. Ten recommendations are shown per page."
        />
        <RecommendationsExplorer recommendations={recommendations} />
      </section>
      <SiteFooter className="mx-auto mt-10 w-full" />
    </main>
  );
}
