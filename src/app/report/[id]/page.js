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
  return (
    <article className={styles.platformCard}>
      <div>
        <span className={styles.platformName}>{item.platform}</span>
        <p className={styles.platformStatus}>{item.status || "Calculated from scan signals"}</p>
      </div>
      <div
        className={`${styles.scorePill} ${styles[tone]}`}
        style={{ "--platform-score": Math.min(100, Math.max(0, Number(item.score) || 0)) }}
      >
        <strong>{item.score}%</strong>
      </div>
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
  const score = Number.isFinite(Number(lead.overallScore)) ? `${lead.overallScore}/100` : "available";

  return createPageMetadata({
    title: `${website} AI Readiness Report`,
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
  const scannedAt = report.scannedAt ? formatDateTime(report.scannedAt) : "Not available";
  const finalUrl = report.finalUrl || website;

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.topbar}>
        <SiteHeader className="mx-auto w-full" />
        <div className={styles.actions}>
          <Link className={styles.action} href="/"><RefreshCw size={18} aria-hidden="true" />Run New Scan</Link>
          <PrintButton className={styles.action} />
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

      <section className={styles.hero}>
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

      <section className={styles.section}>
        <SectionTitle
          kicker="Platform readiness"
          title="AI Platform Scores"
          copy="Estimated from technical signals, structured data, crawl access, content clarity and entity confidence."
        />
        <div className={styles.cards}>
          {platforms.map((item) => <PlatformCard key={item.platform} item={item} />)}
        </div>
      </section>

      <section className={styles.section}>
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

      <section className={styles.section}>
        <SectionTitle
          kicker="Action plan"
          title="Detailed Recommendations"
          copy="Prioritized fixes written for implementation, not just scoring."
        />
        <div className={styles.recommendations}>
          {recommendations.map((item, index) => <RecommendationCard key={item.title} item={item} index={index} />)}
        </div>
      </section>
      <SiteFooter className="mx-auto mt-10 w-full" />
    </main>
  );
}
