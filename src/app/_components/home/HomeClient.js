"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CircleAlert,
  Code2,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  Layers3,
  Lightbulb,
  Lock,
  Mail,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import { AmCheckStateChart, AmOverallScoreChart, AmRadarChart } from "../charts/AmCharts";
import { homeH1 } from "../../seo";
import styles from "../../page.module.css";

const scanSteps = [
  "Checking robots.txt...",
  "Reading sitemap.xml...",
  "Analyzing metadata...",
  "Detecting structured data...",
  "Reviewing headings and content...",
  "Extracting entities...",
  "Running performance audit...",
  "Calculating AI readiness...",
];

const websiteProfiles = [
  { value: "local_business", label: "Local business", copy: "Location-based services, stores, clinics or hospitality" },
  { value: "saas", label: "SaaS", copy: "Subscription software, online platforms or web applications" },
  { value: "ecommerce", label: "Ecommerce", copy: "Online stores, product catalogs and checkout websites" },
  { value: "publisher", label: "Publisher / blog", copy: "News, editorial, educational or article-led websites" },
  { value: "agency", label: "Agency / services", copy: "Consultancies, professional services and creative agencies" },
  { value: "api", label: "API / developer", copy: "APIs, SDKs, technical documentation and developer products" },
];

const features = [
  ["robot", "AI Readiness", "Platform-specific signals for answer engines and LLM crawlers."],
  ["code", "Technical Audit", "Robots, sitemap, HTTPS, metadata, links and renderability."],
  ["database", "Schema Detection", "JSON-LD and microdata detection for major schema types."],
  ["file", "Content Analysis", "Readability, page structure, FAQs, definitions and tables."],
  ["bulb", "AI Recommendations", "Prioritized fixes with effort, rationale and score gain."],
  ["user", "Entity Recognition", "Business, brand, contact, service and location extraction."],
];

function formatScoreLabel(key) {
  if (key === "eeat") return "EEAT";
  const labels = {
    openGraph: "Open Graph",
    headingStructure: "Heading Structure",
    internalLinking: "Internal Linking",
    https: "HTTPS",
  };
  if (labels[key]) return labels[key];
  return String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function validateUrl(value) {
  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);
    return url.hostname.includes(".") || "Enter a valid website URL.";
  } catch {
    return "Enter a valid website URL.";
  }
}

function scoreColor(score) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 60) return "text-[#8B9C8C]";
  if (score >= 45) return "text-amber-300";
  return "text-rose-300";
}

async function readApiResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(fallbackMessage);
    }
  }

  if (!response.ok) {
    const cleanMessage = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(
      response.status === 504
        ? "This website is taking longer than expected to respond. Please try again in a few minutes. If it keeps happening, ask your developer or hosting team to check slow hosting, Cloudflare bot protection, or firewall rules."
        : response.status >= 500
          ? "We could not complete the scan right now. Please try again in a moment."
          : cleanMessage || fallbackMessage
    );
  }

  throw new Error(fallbackMessage);
}

function Section({ title, children, action }) {
  return (
    <section className={`${styles.pageContainer} mx-auto px-5 py-8 sm:px-8`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = "" }) {
  return <div className={`${styles.glass} rounded-3xl p-5 ${className}`}>{children}</div>;
}

function FeatureIcon({ type }) {
  const icons = {
    robot: Bot,
    code: Code2,
    database: Database,
    file: FileText,
    bulb: Lightbulb,
    user: UserRound,
  };
  const Icon = icons[type] || UserRound;
  return <Icon size={38} strokeWidth={1.8} aria-hidden="true" />;
}

function TrustIcon({ type }) {
  const icons = { bolt: Zap, shield: ShieldCheck, lock: Lock };
  const Icon = icons[type] || Lock;
  return <Icon size={22} strokeWidth={1.8} aria-hidden="true" />;
}

const trustHighlights = [
  ["bolt", "Quick Results", "Get actionable insights in minutes."],
  ["shield", "Secure & Private", "We never store your data."],
  ["lock", "No Signup Required", "Start your audit instantly without an account."],
];

const scanFlow = [
  ["01", "Checking robots.txt", "Reviews robots.txt access, AI crawler rules and blocked bots such as GPTBot, ClaudeBot and PerplexityBot."],
  ["02", "Reading sitemap.xml", "Looks for sitemap coverage, valid XML and page discovery signals that help crawlers find important URLs."],
  ["03", "Analyzing metadata", "Checks title, description, canonical, language, robots meta, Open Graph and Twitter card signals."],
  ["04", "Detecting structured data", "Parses JSON-LD and microdata for Organization, FAQ, Service, Product, Breadcrumb and other schema types."],
  ["05", "Reviewing content", "Audits headings, content structure, sentence clarity, definitions, FAQs, images and internal links."],
  ["06", "Extracting entities", "Identifies brand, company, services, email, phone, address and location signals from live page content."],
  ["07", "Running performance audit", "Measures live response and Lighthouse-style performance signals when the environment allows it."],
  ["08", "Calculating readiness", "Weights all technical, content, trust and crawler findings into the final AI readiness recommendations."],
];

const insightStats = [
  ["50+", "technical signals"],
  ["6", "AI platforms"],
  ["100", "weighted score"],
];

function PlatformLogo({ platform }) {
  const logos = {
    ChatGPT: "/chatgpt.png",
    Claude: "/claude.png",
    Gemini: "/gemini.png",
    Perplexity: "/perplexity.png",
    "Google AI Overview": "/google.png",
    "Microsoft Copilot": "/copilot.png",
  };

  const src = logos[platform] || "/logo.png";

  return (
    <Image
      src={src}
      alt={`${platform} logo`}
      width={40}
      height={40}
      className="h-10 w-10 rounded-full object-contain"
    />
  );
}

function platformTone(score) {
  if (score >= 80) return { color: "#90ee9a", text: "text-[#90ee9a]", bg: "bg-[#90ee9a]/10", border: "border-[#90ee9a]/28" };
  if (score >= 45) return { color: "#facc15", text: "text-amber-300", bg: "bg-amber-300/10", border: "border-amber-300/24" };
  return { color: "#fb7185", text: "text-rose-300", bg: "bg-rose-300/10", border: "border-rose-300/24" };
}

function auditTone(score) {
  if (!Number.isFinite(score)) return { text: "text-[#d9e1d8]/65", icon: "text-[#d9e1d8]/65", bg: "bg-white/[.04]", border: "border-white/10", bar: "from-[#59635b] to-[#8B9C8C]", status: "Not measured" };
  if (score >= 80) return { text: "text-[#90ee9a]", icon: "text-[#90ee9a]", bg: "bg-[#90ee9a]/10", border: "border-[#90ee9a]/22", bar: "from-[#2E5E53] to-[#90ee9a]", status: "Strong" };
  if (score >= 45) return { text: "text-amber-300", icon: "text-amber-300", bg: "bg-amber-300/10", border: "border-amber-300/22", bar: "from-[#8B9C8C] to-amber-300", status: "Needs polish" };
  return { text: "text-rose-300", icon: "text-rose-300", bg: "bg-rose-300/10", border: "border-rose-300/22", bar: "from-rose-500 to-rose-300", status: "Needs attention" };
}

function platformBrandColor(platform) {
  const colors = {
    ChatGPT: 0x10a37f,
    Claude: 0xd97757,
    Gemini: 0x4285f4,
    Perplexity: 0xd9e1d8,
    "Google AI Overview": 0xfbbc04,
    "Microsoft Copilot": 0x7c3aed,
  };
  return colors[platform] || 0x90ee9a;
}

function toExternalUrl(value) {
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function hostnameForUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function faviconUrlFor(value) {
  try {
    const url = new URL(value);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=128`;
  } catch {
    return "";
  }
}

function readinessSummary(report, primary) {
  const host = hostnameForUrl(report.finalUrl) || "This website";
  const score = Number(report.overallScore) || 0;
  const level = score >= 90 ? "highly ready" : score >= 75 ? "well positioned" : score >= 55 ? "partially ready" : "not yet ready";
  const strengths = Object.entries(report.scoreBreakdown || {})
    .filter(([, value]) => Number(value) >= 85)
    .map(([key]) => formatScoreLabel(key))
    .slice(0, 2);
  const strengthText = strengths.length ? ` Strongest signals: ${strengths.join(" and ")}.` : "";
  const nextText = primary?.title ? ` Next best action: ${primary.title}.` : "";

  return `${host} is ${level} for AI discovery.${strengthText}${nextText}`;
}

function averageMeasured(values) {
  const measured = values.map((value) => Number(value)).filter(Number.isFinite);
  if (!measured.length) return null;
  return Math.round(measured.reduce((sum, value) => sum + value, 0) / measured.length);
}

function scoreStatus(score) {
  if (!Number.isFinite(score)) return "Not measured";
  if (score >= 80) return "Strong";
  if (score >= 60) return "Improving";
  if (score >= 45) return "Needs work";
  return "At risk";
}

function calculateSearchModeScores(report) {
  const breakdown = report.scoreBreakdown || {};
  const platforms = Array.isArray(report.platformScores) ? report.platformScores : [];
  const geoScore = averageMeasured(platforms.map((item) => item.readinessIndex ?? item.score));
  const leadingPlatform = [...platforms]
    .filter((item) => Number.isFinite(Number(item.readinessIndex ?? item.score)))
    .sort((a, b) => Number(b.readinessIndex ?? b.score) - Number(a.readinessIndex ?? a.score))[0];
  const measuredPlatformCount = platforms.filter((item) => Number.isFinite(Number(item.readinessIndex ?? item.score))).length;
  const metadataScore = report.siteAudit?.metadataAnalysis?.score ?? breakdown.metadata;
  const lighthouseSeoScore = report.performance?.seo;

  return [
    {
      key: "seo",
      label: "SEO Score",
      shortLabel: "SEO",
      icon: TrendingUp,
      score: averageMeasured([
        metadataScore,
        lighthouseSeoScore,
        breakdown.robots,
        breakdown.sitemap,
        breakdown.links,
        breakdown.images,
        report.siteAudit?.categoryScores?.crawlability?.score,
      ]),
      description: "Search engine crawlability, metadata, links, sitemap, image context and Lighthouse SEO signals.",
      record: lighthouseSeoScore == null
        ? "Lighthouse SEO was not measured; score uses technical SEO signals from the live audit."
        : `Lighthouse SEO record: ${lighthouseSeoScore}/100.`,
    },
    {
      key: "aeo",
      label: "AEO Score",
      shortLabel: "AEO",
      icon: Bot,
      score: averageMeasured([
        breakdown.content,
        breakdown.schema,
        breakdown.eeat,
        breakdown.entities,
        breakdown.readability,
        report.siteAudit?.categoryScores?.contentReadiness?.score,
        report.siteAudit?.categoryScores?.trustEvidence?.score,
      ]),
      description: "Answer Engine Optimization readiness for direct answers, schema, entities, trust and quote-friendly content.",
      record: `${report.siteAudit?.diagnostics?.summary?.pass ?? 0} passed checks recorded across the scan.`,
    },
    {
      key: "geo",
      label: "GEO Record",
      shortLabel: "GEO",
      icon: Sparkles,
      score: geoScore,
      description: "Generative Engine Optimization readiness across ChatGPT, Claude, Gemini, Perplexity, Google AI Overview and Copilot signals.",
      record: leadingPlatform
        ? `Best platform record: ${leadingPlatform.platform} at ${Math.round(Number(leadingPlatform.readinessIndex ?? leadingPlatform.score))}/100 across ${measuredPlatformCount} measured platforms.`
        : "Platform readiness was not measured for this scan.",
    },
  ];
}

function SearchModeScoresSection({ report }) {
  const scores = calculateSearchModeScores(report);

  return (
    <Section title="SEO, AEO and GEO scores">
      <div className="grid gap-5 lg:grid-cols-3">
        {scores.map((item) => {
          const tone = auditTone(item.score);
          const Icon = item.icon;

          return (
            <Card key={item.key} className={`relative overflow-hidden border ${tone.border} ${tone.bg} p-6`}>
              <div className="pointer-events-none absolute right-[-4rem] top-[-5rem] size-44 rounded-full bg-[#90ee9a]/8 blur-3xl" />
              <div className="relative flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B9C8C]">{item.label}</p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className={`text-5xl font-semibold leading-none ${tone.text}`}>
                      {Number.isFinite(item.score) ? item.score : "N/A"}
                    </span>
                    {Number.isFinite(item.score) && <span className="pb-1 text-sm font-semibold text-[#d9e1d8]/55">/100</span>}
                  </div>
                </div>
                <span className={`grid size-12 shrink-0 place-items-center rounded-2xl border ${tone.border} ${tone.bg} ${tone.icon}`}>
                  <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
              <div className="relative mt-5">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone.border} ${tone.text}`}>{scoreStatus(item.score)}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B9C8C]">{item.shortLabel}</span>
                </div>
                {Number.isFinite(item.score) && (
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#8B9C8C]/14">
                    <div className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`} style={{ width: `${Math.max(4, Math.min(100, item.score))}%` }} />
                  </div>
                )}
                <p className="mt-5 text-sm leading-6 text-[#d9e1d8]/74">{item.description}</p>
                <p className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-3 text-xs leading-5 text-[#d9e1d8]/62">{item.record}</p>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-5 rounded-2xl border border-[#8B9C8C]/14 bg-white/[.025] p-4 text-sm leading-6 text-[#d9e1d8]/64">
        These are ScanSiteAI diagnostic scores derived from measured technical, content, entity and platform-readiness signals. They are not official Google, OpenAI, Anthropic, Perplexity or Microsoft ratings.
      </p>
    </Section>
  );
}

function PlatformScoresSection({ platforms, scannedLabel }) {
  const [evidencePlatform, setEvidencePlatform] = useState(null);

  useEffect(() => {
    if (!evidencePlatform) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setEvidencePlatform(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [evidencePlatform]);

  return (
    <section className={`${styles.pageContainer} mx-auto px-5 py-10 sm:px-8`}>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="h-9 w-1 rounded-full bg-[#90ee9a]" />
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Estimated Platform Readiness</h2>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#d9e1d8]/68">Qualitative technical-readiness tiers based on measured crawlability, content, structured data, entity, trust, and metadata signals.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[#90ee9a]/25 bg-[#90ee9a]/8 px-5 py-3 text-sm font-semibold text-[#90ee9a]">
          <ShieldCheck size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>Scanned on {scannedLabel}</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {platforms.map((platform) => {
          const tone = platformTone(platform.score);
          const measuredBreakdown = (platform.breakdown || []).filter((item) => item.measured);
          const rankedBreakdown = [...measuredBreakdown].sort((a, b) => b.score - a.score);
          const strongestArea = rankedBreakdown[0];
          const biggestGap = rankedBreakdown[rankedBreakdown.length - 1];
          const priorities = [...measuredBreakdown]
            .filter((item) => item.score < 80)
            .sort((a, b) => a.score - b.score)
            .slice(0, 2);
          const coverageComplete = platform.totalSignals > 0 && platform.measuredSignals === platform.totalSignals;

          return (
            <article key={platform.platform} className="relative overflow-hidden rounded-[1.7rem] bg-black p-6 shadow-[0_22px_60px_rgba(0,0,0,.24)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#90ee9a]/28 to-transparent" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-5">
                  <PlatformLogo platform={platform.platform} />
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold text-white">{platform.label || `${platform.platform} Technical Readiness`}</h3>
                    <p className="mt-1 truncate text-xs text-[#d9e1d8]/55">{platform.crawler || "Platform-specific crawler"}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${tone.bg} ${tone.border} ${tone.text}`}>
                  {platform.tier || platform.status}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[#d9e1d8]/75">
                  Coverage: <strong className="font-semibold text-white">{coverageComplete ? "Complete" : "Partial"} ({platform.measuredSignals}/{platform.totalSignals})</strong>
                </span>
                <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[#d9e1d8]/75">
                  Confidence: <strong className="font-semibold capitalize text-white">{platform.confidence || "low"}</strong>
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#90ee9a]/14 bg-[#90ee9a]/[.05] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#90ee9a]/70">Strongest area</p>
                  <p className="mt-2 text-sm font-semibold text-white">{strongestArea?.label || "Not measured"}</p>
                  <p className="mt-1 text-xs text-[#8B9C8C]">{strongestArea ? `${strongestArea.score}/100` : "No evidence"}</p>
                </div>
                <div className="rounded-2xl border border-amber-300/14 bg-amber-300/[.05] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/70">Biggest gap</p>
                  <p className="mt-2 text-sm font-semibold text-white">{biggestGap?.label || "Not measured"}</p>
                  <p className="mt-1 text-xs text-[#8B9C8C]">{biggestGap ? `${biggestGap.score}/100` : "No evidence"}</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d9e1d8]/45">Priority actions</p>
                <div className="mt-3 grid gap-2">
                  {priorities.length ? priorities.map((item, index) => (
                    <div key={item.key} className="flex items-center gap-3 text-sm text-[#d9e1d8]">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-300/10 text-xs font-semibold text-amber-200">{index + 1}</span>
                      Improve {item.label.toLowerCase()}
                    </div>
                  )) : <p className="text-sm text-[#90ee9a]">No priority gaps detected in measured categories.</p>}
                </div>
              </div>

              <button type="button" onClick={() => setEvidencePlatform(platform)} className="mt-5 flex w-full cursor-pointer items-center justify-between border-t border-white/8 pt-4 text-left text-xs font-semibold text-[#9fe0a8] transition hover:text-[#c5f7cb]">
                <span>View full evidence</span>
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>

      <AnimatePresence>
        {evidencePlatform && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => { if (event.target === event.currentTarget) setEvidencePlatform(null); }}
            role="presentation"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="platform-evidence-title"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[1.7rem] border border-white/10 bg-[#050807] p-6 shadow-[0_28px_100px_rgba(0,0,0,.7)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-5 border-b border-white/8 pb-5">
                <div className="flex min-w-0 items-center gap-4">
                  <PlatformLogo platform={evidencePlatform.platform} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#90ee9a]/70">Full evidence</p>
                    <h3 id="platform-evidence-title" className="mt-1 truncate text-xl font-semibold text-white sm:text-2xl">{evidencePlatform.label}</h3>
                    <p className="mt-1 text-xs text-[#8B9C8C]">{evidencePlatform.crawler}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setEvidencePlatform(null)} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-white/10 bg-white/[.04] text-[#d9e1d8] transition hover:bg-white/10" aria-label="Close full evidence">
                  <X size={19} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-white">Category breakdown</h4>
                  <div className="mt-4 grid gap-4">
                    {(evidencePlatform.breakdown || []).map((item) => <div key={item.key}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="text-[#d9e1d8]/72">{item.label}</span><span className="text-[#8B9C8C]">{item.measured ? item.score : "Not measured"}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[#90ee9a]" style={{ width: `${item.measured ? item.score : 0}%`, opacity: item.measured ? 1 : 0.25 }} /></div></div>)}
                  </div>
                </div>
                <div className="sm:border-l sm:border-white/8 sm:pl-6">
                  <h4 className="text-sm font-semibold text-white">Signal evidence</h4>
                  <div className="mt-4 grid gap-4">
                    {(evidencePlatform.signals || []).map((item) => <div key={item.label} className="flex items-start gap-3 text-xs"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.status === "pass" ? "bg-[#90ee9a]" : item.status === "fail" ? "bg-rose-300" : "bg-amber-300"}`} /><div><p className="text-sm text-[#d9e1d8]">{item.label}</p><p className="mt-1 leading-5 text-[#8B9C8C]">{item.evidence}</p></div></div>)}
                  </div>
                </div>
              </div>

              <div className="mt-7 rounded-2xl border border-white/8 bg-white/[.025] p-4 text-xs leading-5 text-[#8B9C8C]">
                Internal readiness index: {evidencePlatform.readinessIndex == null ? "Not measured" : `${evidencePlatform.readinessIndex}/100`}. Used only for ordering and tier assignment; it is not an official platform visibility score.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-5 rounded-2xl border border-amber-300/18 bg-amber-300/8 p-4 text-sm leading-6 text-amber-100">Proprietary technical-readiness assessment. Not an official platform rating, ranking, citation probability, or visibility measurement.</p>

      <div className="mt-6 flex flex-col gap-5 rounded-[1.6rem] border border-[#8B9C8C]/16 bg-[linear-gradient(135deg,rgba(9,18,16,.92),rgba(4,8,7,.96))] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full border border-[#90ee9a]/22 bg-[#90ee9a]/8 text-[#90ee9a]">
            <Sparkles size={28} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-white">Improve technical readiness</h3>
            <p className="mt-2 text-sm leading-6 text-[#d9e1d8]/68">
              Fix the missing elements to improve crawlability and interpretation. Actual visibility requires query and citation tracking.
            </p>
          </div>
        </div>
        <a href="#top-improvements" className="inline-flex w-fit items-center gap-3 rounded-2xl border border-[#90ee9a]/28 bg-[#90ee9a]/8 px-5 py-3 text-sm font-semibold text-[#90ee9a] transition hover:bg-[#90ee9a]/14">
          <TrendingUp size={19} strokeWidth={2} aria-hidden="true" />
          View Recommendations
          <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function ReportDataTable({ rows, columns, renderRow, getKey, searchText, minWidth = "760px", label = "entries" }) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? rows.filter((row) => searchText(row).toLowerCase().includes(normalized)) : rows;
  }, [query, rows, searchText]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visibleRows = filteredRows.slice(start, start + pageSize);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-xs text-[#d9e1d8]/65">
          Show
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-white/10 bg-[#050807] px-2 py-1.5 text-white outline-none">
            {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          {label}
        </label>
        <label className="flex items-center gap-2 text-xs text-[#d9e1d8]/65">
          <span className="sr-only">Search table</span>
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search pages…" className="w-full rounded-xl border border-white/10 bg-[#050807] px-3 py-2 text-sm text-white outline-none placeholder:text-[#8B9C8C]/55 focus:border-[#90ee9a]/40 sm:w-64" />
        </label>
      </div>
      <div className="max-h-[620px] overflow-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead className="sticky top-0 z-10 bg-[#0a0e0c] text-[#8B9C8C]"><tr>{columns.map((column) => <th key={column} className="p-4 font-semibold">{column}</th>)}</tr></thead>
          <tbody>{visibleRows.map((row, index) => renderRow(row, getKey(row, start + index)))}</tbody>
        </table>
        {!visibleRows.length && <div className="py-12 text-center text-sm text-[#d9e1d8]/55">No matching {label} found.</div>}
      </div>
      <div className="flex flex-col gap-3 border-t border-white/8 p-4 text-xs text-[#d9e1d8]/60 sm:flex-row sm:items-center sm:justify-between">
        <p>Showing {filteredRows.length ? start + 1 : 0}–{Math.min(start + pageSize, filteredRows.length)} of {filteredRows.length}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="rounded-lg border border-white/10 px-3 py-2 font-semibold text-[#d9e1d8] disabled:opacity-35">Previous</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="rounded-lg border border-white/10 px-3 py-2 font-semibold text-[#d9e1d8] disabled:opacity-35">Next</button>
        </div>
      </div>
    </div>
  );
}

function LoadingScan({ step, elapsed = 0 }) {
  const progress = Math.min(92, 8 + (elapsed * 1.05));
  const activeLabel = elapsed > 18
    ? "Scanning representative pages and validating evidence..."
    : scanSteps[step];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.98 }}
      transition={{ duration: 0.28 }}
      className={styles.scanToast}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8B9C8C]">Scanning live</p>
          <h3 className="mt-2 text-base font-semibold leading-6 text-white">{activeLabel}</h3>
          <p className="mt-1 text-xs text-[#8B9C8C]">
            {elapsed < 30 ? "Most scans finish in 30–90 seconds." : "Deep site checks can take a little longer. Please keep this tab open."}
          </p>
        </div>
        <div className={styles.scanSpinner} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`${styles.progressLine} h-full rounded-full`}
          animate={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 grid gap-2">
        {scanSteps.slice(Math.max(0, step - 2), step + 1).map((label, index, visible) => (
          <div key={label} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${index === visible.length - 1 ? "bg-[#8B9C8C]/12 text-[#d9e1d8]" : "text-[#8B9C8C]/70"}`}>
            <span className="size-1.5 rounded-full bg-[#8B9C8C]" />
            {label}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-[#8B9C8C]/75">
        <span>{elapsed}s elapsed</span>
        <span>{Math.round(progress)}% processed</span>
      </div>
    </motion.div>
  );
}

function HeroCtaBand() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38, duration: 0.7 }}
      className={styles.heroBand}
    >
      <div className="flex items-center gap-5">
        <div className={styles.bandIcon}>
          <ShieldCheck size={36} strokeWidth={1.7} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[#9fe0a8]">Built for modern websites.</h3>
          <p className="mt-1 text-sm text-[#d9e1d8]/85">Stay visible in AI answers. Build trust. Get ahead.</p>
        </div>
      </div>
      <a href="#scan-form" className={styles.bandAction}>Run a free scan <ArrowRight size={17} strokeWidth={2} aria-hidden="true" /></a>
      <div className={styles.bandWave} />
    </motion.div>
  );
}

function DesktopIframePreview({ url, host }) {
  const viewportRef = useRef(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const updateScale = () => setScale(viewport.clientWidth / 1280);
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={viewportRef} className="relative size-full overflow-hidden bg-white">
      <iframe
        src={url}
        title={`${host || "Scanned website"} live desktop preview`}
        width="1280"
        height="800"
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        className="absolute left-0 top-0 border-0 bg-white"
        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 pb-3 pt-8 text-[10px] text-white/75">
        <span>Live desktop fallback</span>
        <span>If blank, this website blocks embedded previews.</span>
      </div>
    </div>
  );
}

export function Dashboard({ report, onReset }) {
  const [failedFaviconUrl, setFailedFaviconUrl] = useState("");
  const [failedPreviewUrl, setFailedPreviewUrl] = useState("");
  const breakdown = useMemo(
    () => Object.entries(report.scoreBreakdown).map(([name, value]) => ({ name: formatScoreLabel(name), value })),
    [report]
  );
  const overallSegments = useMemo(() => {
    const platforms = Array.isArray(report.platformScores) ? report.platformScores : [];
    const totalPlatformScore = platforms.reduce((sum, item) => sum + Math.max(0, Number(item.score) || 0), 0);
    const overallScore = Math.max(0, Number(report.overallScore) || 0);

    if (!totalPlatformScore) return [];

    return platforms.map((platform) => ({
      category: platform.platform,
      value: (Math.max(0, Number(platform.score) || 0) / totalPlatformScore) * overallScore,
      score: Number(platform.score) || 0,
      color: platformBrandColor(platform.platform),
    }));
  }, [report]);
  const radar = breakdown.filter((item) => ["Metadata", "Schema", "Content", "EEAT", "Entities", "Robots", "Performance"].includes(item.name));
  const checkStateData = useMemo(() => {
    const summary = report.siteAudit?.diagnostics?.summary || {};
    return [
      { state: "Passed", value: Number(summary.pass) || 0, color: 0x90ee9a },
      { state: "Warnings", value: Number(summary.warning) || 0, color: 0xfacc15 },
      { state: "Failed", value: Number(summary.fail) || 0, color: 0xfb7185 },
      { state: "Not measured", value: Number(summary.notMeasured) || 0, color: 0x8b9c8c },
    ];
  }, [report.siteAudit]);
  const visibleRecommendations = report.recommendations.slice(0, 1);
  const primaryRecommendation = visibleRecommendations[0];
  const hiddenCount = Math.max(report.recommendations.length - 1, 0);
  const scannedAt = report.scannedAt ? new Date(report.scannedAt) : null;
  const scannedLabel = scannedAt && !Number.isNaN(scannedAt.getTime())
    ? scannedAt.toLocaleString()
    : "Just now";
  const scannedDateLabel = scannedAt && !Number.isNaN(scannedAt.getTime())
    ? scannedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "Just now";
  const scannedTimeLabel = scannedAt && !Number.isNaN(scannedAt.getTime())
    ? scannedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "";
  const scannedUrl = toExternalUrl(report.finalUrl);
  const scannedHost = hostnameForUrl(report.finalUrl);
  const candidateFaviconUrl = faviconUrlFor(report.finalUrl);
  const faviconUrl = candidateFaviconUrl === failedFaviconUrl ? "" : candidateFaviconUrl;
  const platformLeaders = [...(report.platformScores || [])].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 6);
  const scoreBand = Number(report.overallScore) >= 90 ? "Excellent" : Number(report.overallScore) >= 75 ? "Strong" : Number(report.overallScore) >= 55 ? "Improving" : "Needs work";
  const scoreTone = Number(report.overallScore) >= 75 ? "Your website is well optimized for AI discovery." : "Your website has clear opportunities to improve AI discovery.";
  const keyStrengths = [
    {
      icon: Target,
      label: platformLeaders[0] ? `${platformLeaders[0].platform} readiness signals` : "Strong readiness signals",
    },
    {
      icon: ShieldCheck,
      label: report.eeat?.score >= 70 ? "Trust & authority" : "Technical crawl foundation",
    },
  ];
  const candidatePreviewImage = report.preview?.image || "";
  const previewImage = candidatePreviewImage === failedPreviewUrl ? "" : candidatePreviewImage;
  const dynamicSummary = readinessSummary(report, primaryRecommendation);

  async function copyScannedUrl() {
    if (!scannedUrl) return;
    try {
      await navigator.clipboard.writeText(scannedUrl);
      toast.success("Scanned URL copied.");
    } catch {
      toast.error("Could not copy URL.");
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-16">
      <section className={`${styles.pageContainer} mx-auto px-5 py-8 sm:px-8`}>
        <div className="relative overflow-hidden rounded-[2rem]  shadow-[0_24px_70px_rgba(0,0,0,.30)] sm:p-7">
          {/* <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,rgba(144,238,154,.14)_1px,transparent_1.5px)] [background-size:18px_18px] [mask-image:radial-gradient(circle_at_15%_28%,black,transparent_24%)]" /> */}
          <div className="relative mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <span className="h-9 w-1 rounded-full bg-[#90ee9a]" />
                <h1 className="text-3xl font-semibold tracking-tight text-white">Report Dashboard</h1>
              </div>
              <p className="mt-3 text-base text-[#d9e1d8]/72">Overview of your AI Website Readiness scan and next best action.</p>
            </div>
            <button onClick={onReset} className="inline-flex w-fit items-center gap-3 rounded-full border border-[#90ee9a]/25 bg-[#90ee9a]/8 px-5 py-3.5 text-sm font-semibold text-[#9fe0a8] transition hover:border-[#90ee9a]/50 hover:bg-[#90ee9a]/14">
              <RefreshCw size={21} strokeWidth={2} aria-hidden="true" />
              Run another scan
            </button>
          </div>

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
            <div className="grid gap-6">
              <div className="grid gap-6 lg:grid-cols-[45fr_55fr] lg:items-start">
                <div className="grid gap-5">
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-[#90ee9a]/16 bg-[#90ee9a]/8 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#90ee9a]">
                  {scoreBand}
                </span>
                <span className="grid size-7 place-items-center rounded-full bg-[#90ee9a]/10 text-[#90ee9a]">
                  <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
                </span>
              </div>

              <div className="grid justify-items-center">
                <div className="relative grid size-64 place-items-center overflow-visible rounded-full bg-[radial-gradient(circle,rgba(139,156,140,.08),transparent_64%)] sm:size-72 lg:size-80">
                  <div className="absolute inset-2 rounded-full border border-[#8B9C8C]/10" />
                  <AmOverallScoreChart score={report.overallScore} data={overallSegments} className="absolute inset-5 sm:inset-6" />
                  <div className="relative z-10 grid size-40 place-items-center rounded-full bg-[#020806] shadow-[inset_0_0_32px_rgba(0,0,0,.50)] sm:size-44">
                    <div className="text-center">
                      <div className="text-6xl font-semibold leading-none text-white">{report.overallScore}</div>
                      <div className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#90ee9a]">Grade {report.grade}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#8B9C8C]/12 bg-[#07100e]/78 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#90ee9a]/10 text-[#90ee9a]">
                    <Star size={20} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm leading-6 text-[#d9e1d8]">{scoreTone}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      {keyStrengths.map(({ icon: Icon, label }) => (
                        <span key={label} className="inline-flex items-center gap-2 text-xs font-semibold leading-5 text-[#d9e1d8]/78">
                          <Icon size={15} strokeWidth={1.9} className="text-[#90ee9a]" aria-hidden="true" />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div>
              {/* <p className="mb-5 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.32em] text-[#90ee9a]">
                <span className="grid size-8 place-items-center rounded-full bg-[#90ee9a]/10">
                  <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
                </span>
                Live Website Preview
              </p> */}
              <div className="overflow-hidden rounded-[1.35rem] border border-[#8B9C8C]/18 bg-[#07100e]/78 shadow-[0_22px_70px_rgba(0,0,0,.32)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#8B9C8C]/12 bg-black/28 px-4 py-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-[#d9e1d8]">
                    <Lock size={14} strokeWidth={2} className="shrink-0 text-[#8B9C8C]" aria-hidden="true" />
                    <span className="truncate">{scannedHost || "Scanned website"}</span>
                  </span>
                  {scannedUrl && (
                    <a href={scannedUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 font-semibold text-white transition hover:text-[#90ee9a]">
                      Visit site
                      <ExternalLink size={15} strokeWidth={1.9} aria-hidden="true" />
                    </a>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-[radial-gradient(circle_at_center,rgba(144,238,154,.12),transparent_58%),#020806]">
                  {previewImage ? (
                    // Scan screenshots are generated as data URLs by the API; native image avoids remote loader config.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt={`${scannedHost || "Scanned website"} first screen screenshot`}
                      className="size-full object-cover"
                      onError={() => setFailedPreviewUrl(previewImage)}
                    />
                  ) : scannedUrl ? (
                    <DesktopIframePreview url={scannedUrl} host={scannedHost} />
                  ) : (
                    <div className="grid size-full place-items-center p-8 text-center">
                      <div>
                        <Globe2 className="mx-auto text-[#90ee9a]" size={42} strokeWidth={1.7} aria-hidden="true" />
                        <p className="mt-4 text-sm font-semibold text-white">Website preview unavailable</p>
                        <p className="mt-2 text-xs text-[#8B9C8C]">Preview availability never affects readiness scoring.</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid gap-4 border-t border-[#8B9C8C]/12 p-4">
                  <p className="text-sm leading-6 text-[#d9e1d8]/74">{dynamicSummary}</p>
                  {primaryRecommendation && (
                    <a
                      href="#top-improvements"
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-[#90ee9a]/18 bg-[#90ee9a]/8 p-4 text-left transition hover:border-[#90ee9a]/42 hover:bg-[#90ee9a]/12"
                    >
                      <span className="flex items-center gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#42e878]/18 text-[#68ef8b]">
                          <Lightbulb size={22} strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <span>
                          <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#90ee9a]">Top Recommendation</span>
                          <span className="mt-1 block text-base font-semibold leading-snug text-white">{primaryRecommendation.title}</span>
                        </span>
                      </span>
                      <ArrowRight size={20} strokeWidth={2} className="shrink-0 text-[#90ee9a] transition group-hover:translate-x-1" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            </div>

              </div>

            <div className="rounded-[1.35rem] ">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                  <span className="grid size-[100px] shrink-0 place-items-center overflow-hidden rounded-3xl border border-[#90ee9a]/18 bg-[#90ee9a]/8 text-[#90ee9a] shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
                    {faviconUrl ? (
                      // Dynamic third-party favicons are not known at build time, so a native image is the right fit here.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={faviconUrl}
                        alt={`${scannedHost || "Scanned website"} favicon`}
                        width="100"
                        height="100"
                        className="size-[100px] object-contain p-4"
                        onError={() => setFailedFaviconUrl(faviconUrl)}
                      />
                    ) : (
                      <Globe2 size={42} strokeWidth={1.7} aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white">Scanned Website</p>
                    <p className="mt-1 text-sm text-[#d9e1d8]/58">Data is collected in real-time and analyzed using 50+ AI signals</p>
                    <div className="mt-3 flex flex-col gap-2 text-sm text-[#d9e1d8]/58 sm:flex-row sm:flex-wrap sm:items-center">
                      <span className="inline-flex items-center gap-2"><CalendarDays size={15} aria-hidden="true" />{scannedDateLabel}</span>
                      {scannedTimeLabel && <span className="inline-flex items-center gap-2"><Clock3 size={15} aria-hidden="true" />{scannedTimeLabel}</span>}
                      <span className="inline-flex items-center gap-2 text-[#90ee9a]"><span className="size-2 rounded-full bg-[#90ee9a]" />Live</span>
                    </div>
                    {scannedUrl && (
                      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-sm">
                        <a
                          href={scannedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-w-0 items-center gap-2 font-semibold text-[#9fe0a8] underline decoration-[#90ee9a]/35 underline-offset-4 transition hover:text-white hover:decoration-[#90ee9a]"
                        >
                          <Globe2 size={16} strokeWidth={1.9} aria-hidden="true" />
                          <span className="truncate [overflow-wrap:anywhere]">{report.finalUrl}</span>
                        </a>
                        <button
                          type="button"
                          onClick={copyScannedUrl}
                          className="rounded-full border border-[#90ee9a]/20 bg-[#90ee9a]/8 px-3 py-1 text-xs font-semibold text-[#9fe0a8] transition hover:border-[#90ee9a]/45 hover:bg-[#90ee9a]/14"
                        >
                          Copy URL
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <span className="hidden w-fit items-center gap-2 rounded-full border border-[#8B9C8C]/14 bg-[#90ee9a]/8 px-4 py-2 text-sm font-semibold text-[#90ee9a] lg:inline-flex">
                  <span className="size-2.5 rounded-full bg-[#90ee9a]" />
                  Live
                </span>
              </div>
            </div>
            </div>
            <aside className="relative flex min-h-[31rem] overflow-hidden rounded-[1.5rem] border border-[#8B9C8C]/18 bg-[linear-gradient(145deg,rgba(13,31,25,.96),rgba(4,8,6,.92)_58%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
              <div className="pointer-events-none absolute right-[-7rem] top-[-8rem] size-72 rounded-full bg-[#90ee9a]/10 blur-3xl" />
              <div className="relative flex w-full flex-col">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#90ee9a]">Complete report</p>
                    
                  </div>
                  
                </div>
                <h3 className="mt-8 text-3xl font-semibold leading-tight text-white">Send the full AI readiness report.</h3>
                <p className="mt-8 border-t border-[#8B9C8C]/12 pt-7 text-base leading-7 text-[#d9e1d8]/72">
                  Get the complete report by email with detailed analysis, platform scores and actionable recommendations.
                </p>
                <div className="mt-8">
                  <EmailCapture report={report} compact bare buttonLabel="Send Report" showCallOption={false} />
                </div>
                <div className="mt-auto flex items-start gap-3 pt-7 text-sm leading-6 text-[#d9e1d8]/72">
                  <Lock className="mt-0.5 shrink-0 text-[#d9e1d8]/62" size={18} strokeWidth={2} aria-hidden="true" />
                  <p>We respect your privacy. Your data is secure and will never be shared.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <PlatformScoresSection platforms={report.platformScores} scannedLabel={scannedLabel} />

      <SearchModeScoresSection report={report} />

      <EntityConsistencySection analysis={report.siteAudit?.entityAnalysis} />

      <ScanReliabilitySection audit={report.siteAudit} calibration={report.scoringCalibration} preview={report.preview} />

      <Section title="Readiness and action priorities">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="h-[26rem] p-5 sm:h-[30rem]">
            <div><h3 className="text-lg font-semibold text-white">Current readiness</h3><p className="mt-1 text-xs text-[#8B9C8C]">Current health across measured audit categories.</p></div>
            <div className="h-[calc(100%-3.5rem)]"><AmRadarChart data={radar} /></div>
          </Card>
          <Card className="h-[26rem] p-5 sm:h-[30rem]">
            <div><h3 className="text-lg font-semibold text-white">Scan result statistics</h3><p className="mt-1 text-xs text-[#8B9C8C]">Distribution of every measured check by outcome.</p></div>
            <div className="h-[calc(100%-3.5rem)]"><AmCheckStateChart data={checkStateData} /></div>
          </Card>
        </div>
      </Section>

      <TechnicalAuditSection report={report} />

      <div id="top-improvements" />
      <TopImprovementsSection
        report={report}
        visibleRecommendations={visibleRecommendations}
        hiddenCount={hiddenCount}
      />

      <ContentOpportunitiesSection opportunities={report.contentOpportunities} />

    </motion.div>
  );
}

function SiteCoverageSection({ audit, profile }) {
  if (!audit?.pages?.length) return null;
  const categories = Object.entries(audit.categoryScores || {});
  const profileLabel = String(profile?.value || "auto").replaceAll("_", " ");
  return (
    <Section title="Site-wide scan coverage">
      <div className="mb-5 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full border border-[#90ee9a]/20 bg-[#90ee9a]/8 px-4 py-2 text-[#9fe0a8]">Profile: {profileLabel} ({profile?.source || "detected"})</span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[#d9e1d8]">{audit.coverage.scanned} pages scanned</span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[#d9e1d8]">{audit.coverage.rendered} rendered</span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[#d9e1d8]">JS-dependent content: {audit.rendering.averageJsDependentPercent ?? "Not measured"}{audit.rendering.averageJsDependentPercent != null ? "%" : ""}</span>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map(([key, value]) => (
          <Card key={key} className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B9C8C]">{formatScoreLabel(key)}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{value.measured ? value.score : "Not measured"}</p>
          </Card>
        ))}
      </div>
      <ReportDataTable
        rows={audit.pages}
        columns={["Page", "Type", "Status", "Raw words", "JS dependent", "Schema", "Issues"]}
        getKey={(page) => page.requestedUrl || page.url}
        searchText={(page) => `${page.url} ${page.role} ${page.status ?? "unknown"}`}
        renderRow={(page, key) => (
              <tr key={key} className="border-t border-white/8 text-[#d9e1d8]">
                <td className="max-w-[260px] truncate p-4"><a href={page.url} target="_blank" rel="noreferrer" className="text-[#9fe0a8] hover:underline">{page.url}</a></td>
                <td className="p-4 capitalize">{page.role}</td><td className="p-4">{page.status ?? "Unknown"}</td><td className="p-4">{page.raw?.wordCount ?? 0}</td>
                <td className="p-4">{page.rendered?.jsDependentPercent == null ? "Not measured" : `${page.rendered.jsDependentPercent}%`}</td>
                <td className="p-4">{page.schema?.score ?? 0}</td><td className="p-4">{(page.findings || []).filter((item) => item.status !== "pass").length}</td>
              </tr>
        )}
      />
    </Section>
  );
}

function MetadataQualitySection({ audit }) {
  const analysis = audit?.metadataAnalysis;
  if (!analysis) return null;
  return (
    <Section title="SEO metadata quality">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#8B9C8C]">Quality score</p><p className="mt-3 text-3xl font-semibold text-white">{analysis.score}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#8B9C8C]">Unique titles</p><p className="mt-3 text-3xl font-semibold text-white">{analysis.pagesWithUniqueTitles}/{analysis.pagesChecked}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#8B9C8C]">Unique descriptions</p><p className="mt-3 text-3xl font-semibold text-white">{analysis.pagesWithUniqueDescriptions}/{analysis.pagesChecked}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#8B9C8C]">Duplicate groups</p><p className="mt-3 text-3xl font-semibold text-white">{analysis.duplicateTitles.length + analysis.duplicateDescriptions.length}</p></Card>
      </div>
      <ReportDataTable
        rows={audit.pages}
        columns={["Page", "Title", "Title size", "H1 alignment", "Description size", "Relevance", "Unique"]}
        minWidth="900px"
        getKey={(page) => page.url}
        searchText={(page) => `${page.url} ${page.title || "missing"} ${page.description || ""}`}
        renderRow={(page, key) => <tr key={key} className="border-t border-white/8 text-[#d9e1d8]"><td className="max-w-[220px] truncate p-4">{page.url}</td><td className="max-w-[260px] truncate p-4">{page.title || "Missing"}</td><td className="p-4">{page.metadataQuality?.title.length ?? 0} chars / {page.metadataQuality?.title.estimatedPixels ?? 0}px</td><td className="p-4">{page.metadataQuality?.title.h1AlignmentPercent ?? "N/A"}%</td><td className="p-4">{page.metadataQuality?.description.length ?? 0} chars / {page.metadataQuality?.description.estimatedPixels ?? 0}px</td><td className="p-4">{page.metadataQuality?.description.relevancePercent ?? "N/A"}%</td><td className="p-4">{page.metadataQuality?.uniqueness?.pageSpecific ? "Yes" : "No"}</td></tr>}
      />
      <p className="mt-4 text-xs leading-5 text-[#8B9C8C]">Pixel widths are deterministic estimates for auditing, not exact Google rendering measurements. Search engines may rewrite snippets.</p>
    </Section>
  );
}

function EntityConsistencySection({ analysis }) {
  if (!analysis) return null;
  const checks = [
    ["Entity Identity", analysis.entityIdentity, (item) => `Detected name: ${item.detectedName || "Not found"} · Organization pages: ${item.pagesWithOrganization}/${item.pagesChecked}`],
    ["Entity Connections", analysis.entityConnections, (item) => `${item.relationships?.length || 0} relationships · ${item.unresolvedRelationships?.length || 0} unresolved · ${item.externalProfiles?.length || 0} external profiles`],
    ["Brand Name Consistency", analysis.brandNameConsistency, (item) => item.variants?.length ? `Primary: ${item.primaryName || "Unknown"} · Variants: ${item.variants.map((variant) => variant.value).join(", ")}` : "No reliable brand-name signals detected"],
    ["NAP Consistency", analysis.napConsistency, (item) => item.applicable ? `${item.names?.length || 0} names · ${item.addresses?.length || 0} addresses · ${item.phones?.length || 0} phone numbers · ${item.conflicts?.length || 0} conflicts` : item.note],
  ];
  const statusTone = { pass: "text-[#90ee9a] border-[#90ee9a]/25 bg-[#90ee9a]/8", warning: "text-amber-200 border-amber-300/25 bg-amber-300/8", fail: "text-rose-200 border-rose-300/25 bg-rose-300/8", not_applicable: "text-[#d9e1d8] border-white/10 bg-white/[0.03]" };
  return (
    <Section title="Entity consistency">
      <p className="mb-6 max-w-3xl text-sm leading-6 text-[#d9e1d8]/68">Cross-page comparison of who the organization is, how its entities connect, and whether brand and local-business details agree.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {checks.map(([title, item, detail]) => (
          <Card key={title} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-lg font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-[#d9e1d8]/68">{detail(item)}</p></div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusTone[item.status] || statusTone.not_applicable}`}>{item.status.replaceAll("_", " ")}</span>
            </div>
            <div className="mt-5 flex items-end justify-between border-t border-white/8 pt-4"><span className="text-xs uppercase tracking-[0.16em] text-[#8B9C8C]">Score</span><strong className="text-3xl text-white">{item.score == null ? "N/A" : item.score}</strong></div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function ScanReliabilitySection({ audit, calibration, preview }) {
  if (!audit?.diagnostics) return null;
  const summary = audit.diagnostics.summary;
  const schemaPages = audit.pages.filter((page) => page.schemaComparison?.measured);
  return (
    <Section title="Scan evidence and reliability">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#8B9C8C]">Scan confidence</p><p className="mt-3 text-3xl font-semibold capitalize text-white">{audit.confidence.level}</p><p className="mt-2 text-xs text-[#d9e1d8]/60">{audit.confidence.score}/100 coverage confidence</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#8B9C8C]">Check states</p><p className="mt-3 text-sm leading-6 text-[#d9e1d8]">{summary.pass} pass · {summary.warning} warning · {summary.fail} fail · {summary.notMeasured} not measured</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#8B9C8C]">Schema comparison</p><p className="mt-3 text-sm leading-6 text-[#d9e1d8]">{schemaPages.length} pages compared · {schemaPages.filter((page) => page.schemaComparison.addedAfterJavaScript.length).length} with rendered-only schema</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#8B9C8C]">Preview</p><p className="mt-3 text-sm capitalize text-[#d9e1d8]">{preview?.status || (preview?.image ? "captured" : "unavailable")}</p><p className="mt-2 text-xs text-[#d9e1d8]/60">{preview?.attempts?.length || 0} capture attempts; never affects score</p></Card>
      </div>
      <div>
        <Card className="p-6"><h3 className="text-lg font-semibold text-white">Coverage evidence</h3><ul className="mt-4 grid gap-2 text-sm text-[#d9e1d8]/70">{audit.confidence.reasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul><p className="mt-4 text-xs text-[#8B9C8C]">Scanner {audit.diagnostics.scannerVersion} · {audit.diagnostics.durationMs}ms · calibration {calibration?.version || "unversioned"}</p></Card>
      </div>
    </Section>
  );
}

function ContentOpportunitiesSection({ opportunities = [] }) {
  const found = opportunities.filter((item) => !item.suggested);
  const suggested = opportunities.filter((item) => item.suggested);

  if (!opportunities.length) return null;

  return (
    <section className={`${styles.pageContainer} mx-auto p-0`}>
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="h-9 w-1 rounded-full bg-[#90ee9a]" />
            <h2 className="text-3xl font-semibold tracking-tight text-white">Content Opportunities</h2>
          </div>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#d9e1d8]/68">
            Pages and content assets that help answer engines understand trust, services, proof and intent.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#90ee9a]/20 bg-[#90ee9a]/8 px-4 py-2 text-sm font-semibold text-[#9fe0a8]">
            <CheckCircle2 size={17} aria-hidden="true" />
            {found.length} signals found
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/8 px-4 py-2 text-sm font-semibold text-amber-200">
            <CircleAlert size={17} aria-hidden="true" />
            {suggested.length} opportunities
          </span>
        </div>
      </div>

      <div className={`${styles.opportunityPanel} rounded-[2rem] p-5 sm:p-6`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {opportunities.map((item, index) => (
            <article key={item.page} className={`${styles.opportunityCard} group rounded-[1.35rem] p-4`}>
              <div className="flex items-start justify-between gap-4">
                <span className={`grid size-11 place-items-center rounded-2xl ${item.suggested ? "bg-amber-300/10 text-amber-200" : "bg-[#90ee9a]/10 text-[#90ee9a]"}`}>
                  {item.suggested ? <Lightbulb size={22} strokeWidth={1.8} aria-hidden="true" /> : <CheckCircle2 size={22} strokeWidth={1.8} aria-hidden="true" />}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B9C8C]">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-base font-semibold leading-snug text-white">{item.page}</h3>
              <p className="mt-2 text-sm leading-6 text-[#d9e1d8]/62">
                {item.suggested
                  ? "Recommended to improve topical coverage and answer-ready context."
                  : "Detected on the scanned website as a helpful AI trust signal."}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-[#8B9C8C]/12 pt-4">
                <span className={`text-sm font-bold ${item.suggested ? "text-amber-200" : "text-[#9fe0a8]"}`}>
                  {item.suggested ? "Suggested" : "Signal found"}
                </span>
                <ArrowRight size={18} strokeWidth={1.8} className="text-[#8B9C8C] transition group-hover:translate-x-1 group-hover:text-[#90ee9a]" aria-hidden="true" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TopImprovementsSection({ report, visibleRecommendations, hiddenCount }) {
  const primary = visibleRecommendations[0];
  const hiddenRecommendations = report.recommendations.slice(1);
  const hiddenPreview = hiddenRecommendations.slice(0, 3);
  const remainingHidden = Math.max(hiddenRecommendations.length - hiddenPreview.length, 0);
  const hiddenPointOpportunity = Math.min(
    Math.max(0, 100 - (Number(report.overallScore) || 0)),
    hiddenRecommendations.reduce((sum, item) => sum + (Number(item.expectedGain) || 0), 0),
  );

  if (!primary) return null;

  return (
    <section className={`${styles.pageContainer} mx-auto px-5 py-8 sm:px-8`}>
      <div className="mb-7">
        <div className="flex items-center gap-4">
          <span className="h-9 w-1 rounded-full bg-[#90ee9a]" />
          <h2 className="text-3xl font-semibold tracking-tight text-white">Top Improvements</h2>
        </div>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#d9e1d8]/68">
          Prioritized fixes ranked by expected AI readiness impact.
        </p>
      </div>

      <div className="grid gap-6">
        <article className="relative overflow-hidden rounded-[2rem] border border-[#8B9C8C]/16 bg-[linear-gradient(135deg,rgba(8,17,14,.94),rgba(4,8,6,.97))] p-6 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_center,rgba(144,238,154,.12)_1px,transparent_1.5px)] [background-size:20px_20px] [mask-image:linear-gradient(90deg,black,transparent_70%)]" />
          <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <span className="grid size-14 place-items-center rounded-2xl border border-[#90ee9a]/22 bg-[#90ee9a]/10 text-[#90ee9a]">
                  <Sparkles size={29} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <span className="inline-flex rounded-full border border-amber-300/22 bg-amber-300/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
                    High priority
                  </span>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl">{primary.title}</h3>
                </div>
              </div>
              <p className="mt-5 max-w-4xl text-base leading-8 text-[#d9e1d8]/78">{primary.description}</p>
              {(primary.affectedUrl || primary.evidence) && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-[#d9e1d8]/72">
                  {primary.affectedUrl && <p><strong className="text-white">Affected URL:</strong> {primary.affectedUrl}</p>}
                  {primary.affectedElement && <p><strong className="text-white">Element:</strong> <code>{primary.affectedElement}</code></p>}
                  {primary.evidence && <p><strong className="text-white">Evidence:</strong> {primary.evidence}</p>}
                  {primary.confidence && <p><strong className="text-white">Confidence:</strong> {primary.confidence}</p>}
                </div>
              )}

              <div className="mt-6 grid gap-5 border-t border-[#8B9C8C]/12 pt-6 md:grid-cols-3">
                <ImprovementInfo icon={CircleAlert} tone="rose" label="Current Status" value={primary.currentStatus} />
                <ImprovementInfo icon={Bot} tone="blue" label="Why AI Cares" value={primary.whyAiCares} />
                <ImprovementInfo icon={CheckCircle2} tone="green" label="How To Fix" value={primary.howToFix} />
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-[#8B9C8C]/18 bg-[radial-gradient(circle_at_top_right,rgba(144,238,154,.18),transparent_8rem),rgba(7,16,14,.82)] p-5 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9e1d8]/62">Expected Score Gain</p>
              <div className="mx-auto mt-5 grid size-32 place-items-center rounded-full bg-[conic-gradient(#90ee9a_calc(var(--gain)*1%),rgba(139,156,140,.18)_0)] p-3" style={{ "--gain": Math.min(100, Math.max(12, primary.expectedGain * 10)) }}>
                <div className="grid size-full place-items-center rounded-full bg-[#020806]">
                  <div>
                    <p className="text-4xl font-semibold text-[#90ee9a]">+{primary.expectedGain}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#d9e1d8]/54">Points</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {hiddenCount > 0 && (
          <div className={`${styles.lockedPanel} rounded-[2rem] p-0`}>
            <div className="relative grid overflow-hidden rounded-[2rem] lg:grid-cols-[minmax(0,1fr)_30rem]">
              <div className={`${styles.lockedPanelInfo} p-6 sm:p-8`}>
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className="inline-flex rounded-full border border-[#90ee9a]/22 bg-[#90ee9a]/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#9fe0a8]">
                      Locked recommendations
                    </span>
                    <h3 className={`${styles.heroTitle} mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl`}>
                      You are seeing only the first fix.
                    </h3>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-[#d9e1d8]/72">
                      Unlock {hiddenCount} more AI-readiness {hiddenCount === 1 ? "fix" : "fixes"} with exact status, AI rationale, implementation steps and expected score gain.
                    </p>
                  </div>
                  <div className="shrink-0 rounded-[1.5rem] border border-[#90ee9a]/18 bg-[#90ee9a]/10 px-5 py-4 text-center shadow-[0_0_38px_rgba(144,238,154,.08)]">
                    <p className="text-4xl font-semibold text-[#90ee9a]">{hiddenCount}</p>
                    <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#d9e1d8]/60">{hiddenCount === 1 ? "hidden fix" : "hidden fixes"}</p>
                    <p className="mt-2 text-xs text-[#d9e1d8]/55">Up to +{hiddenPointOpportunity} points combined</p>
                  </div>
                </div>

                <div className="mt-7 grid gap-3">
                  {hiddenPreview.map((item, index) => (
                    <div key={item.title} className={`${styles.lockedTeaser} flex items-center gap-4 rounded-2xl p-4`}>
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#020806] text-[#90ee9a]">
                        <Lock size={20} strokeWidth={1.9} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[#d9e1d8]/58">Hidden fix #{index + 2} • {Number(item.expectedGain) > 0 ? `expected gain +${item.expectedGain} points` : "impact included in a related fix"}</p>
                      </div>
                      <ArrowRight size={18} strokeWidth={1.8} className="hidden shrink-0 text-[#90ee9a] sm:block" aria-hidden="true" />
                    </div>
                  ))}
                  {remainingHidden > 0 && (
                    <div className="flex items-center justify-between rounded-2xl border border-dashed border-[#90ee9a]/24 bg-[#90ee9a]/6 px-4 py-3 text-sm font-semibold text-[#d9e1d8]">
                      <span>Plus {remainingHidden} more locked recommendations</span>
                      <span className="text-[#90ee9a]">After email</span>
                    </div>
                  )}
                </div>

                <div className="mt-7 grid gap-4 border-t border-[#8B9C8C]/12 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    [FileText, "Full Report", "Detailed findings"],
                    [TrendingUp, "Platform Scores", "Compare AI systems"],
                    [ShieldCheck, "Technical Checks", "Complete coverage"],
                    [UserRound, "Expert Support", "Call available"],
                  ].map(([Icon, title, copy]) => (
                    <div key={title} className="flex gap-3">
                      <Icon size={22} strokeWidth={1.8} className="shrink-0 text-[#90ee9a]" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-white">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-[#d9e1d8]/58">{copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${styles.lockedPanelForm} border-t border-[#8B9C8C]/12 p-6 sm:p-8 lg:border-l lg:border-t-0`}>
                <div className="mb-5 flex items-center gap-4">
                  <span className="grid size-12 place-items-center rounded-2xl border border-[#90ee9a]/30 bg-[#90ee9a]/12 text-[#90ee9a] shadow-[0_0_28px_rgba(144,238,154,.12)]">
                    <Mail size={25} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#90ee9a]">Unlock hidden fixes</p>
                    <p className="mt-1 text-sm text-[#d9e1d8]/62">{hiddenCount} more {hiddenCount === 1 ? "recommendation" : "recommendations"} available</p>
                  </div>
                </div>
                <EmailCapture report={report} compact bare buttonLabel={`Unlock ${hiddenCount} Hidden ${hiddenCount === 1 ? "Fix" : "Fixes"}`} />
                <div className="mt-5 flex gap-3 rounded-2xl bg-[#07100e]/70 p-4 text-sm leading-6 text-[#d9e1d8]/68">
                  <Lock size={21} strokeWidth={1.8} className="mt-0.5 shrink-0 text-[#90ee9a]" aria-hidden="true" />
                  <p>Your data is secure and never shared. Includes platform scores, checklist, and recommendations.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ImprovementInfo({ icon: Icon, tone, label, value }) {
  const tones = {
    rose: "border-rose-300/30 bg-rose-300/10 text-rose-200",
    blue: "border-sky-300/28 bg-sky-300/10 text-sky-200",
    green: "border-[#90ee9a]/30 bg-[#90ee9a]/10 text-[#90ee9a]",
  };

  return (
    <div className="flex gap-4 md:border-l md:border-[#8B9C8C]/14 md:pl-5 first:md:border-l-0 first:md:pl-0">
      <span className={`grid size-12 shrink-0 place-items-center rounded-full border ${tones[tone]}`}>
        <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B9C8C]">{label}</p>
        <p className="mt-2 text-sm leading-7 text-[#d9e1d8]/78">{value}</p>
      </div>
    </div>
  );
}

function TechnicalAuditSection({ report }) {
  const checks = Object.entries(report.checklist || {});
  const passed = checks.filter(([, value]) => value === true).length;
  const attention = checks.filter(([, value]) => value === false).length;
  const notMeasured = checks.filter(([, value]) => value == null).length;
  const eeatSignals = report.eeat.signals || {};
  const allServiceNames = report.entities.services || [];
  const allProductNames = report.entities.products || [];
  const serviceNames = allServiceNames.slice(0, 5);
  const productNames = allProductNames.slice(0, 5);
  const schemaGaps = [...new Set((report.siteAudit?.pages || []).flatMap((page) => (page.schema?.issues || []).flatMap((issue) => [
    ...(issue.missingRequired || []).map((property) => `${issue.type}.${property} (required)`),
    ...(issue.missingRecommended || []).map((property) => `${issue.type}.${property}`),
  ])))];
  const measuredSchemaPages = (report.siteAudit?.pages || []).filter((page) => Number.isFinite(page.status) && Number.isFinite(page.schema?.score));
  const schemaAuditScore = measuredSchemaPages.length
    ? Math.round(measuredSchemaPages.reduce((sum, page) => sum + page.schema.score, 0) / measuredSchemaPages.length)
    : report.schema.score;
  const entityAuditScore = report.entities.score;
  const auditCards = [
    {
      icon: Database,
      title: "Schema Audit",
      score: schemaAuditScore,
      lines: [
        `Present: ${report.schema.present.join(", ") || "None detected"}`,
        `Relevant property gaps: ${schemaGaps.slice(0, 4).join(", ") || "None detected"}`,
        `Invalid blocks: ${report.schema.invalid.length}`,
      ],
    },
    {
      icon: FileText,
      title: "Content Audit",
      score: report.content.score,
      lines: [
        `Words: ${report.content.wordCount}`,
        `Average sentence: ${report.content.averageSentenceWords} words`,
        `FAQ detected: ${report.content.hasFAQ ? "Yes" : "No"}`,
      ],
    },
    {
      icon: TrendingUp,
      title: "Performance",
      score: report.performance.performance,
      lines: report.performance.fallback
        ? [
          "HTTP diagnostics measured",
          "Lighthouse performance score unavailable",
          `Response time: ${report.performance.responseTimeMs}ms`,
          `HTML size: ${Math.round((report.performance.htmlBytes || 0) / 1024)}KB`,
        ]
        : [
          `Source: ${report.performance.source || "Lighthouse"}`,
          `Accessibility: ${report.performance.accessibility ?? "Not measured"}`,
          `SEO: ${report.performance.seo ?? "Not measured"}`,
          `Best Practices: ${report.performance.bestPractices ?? "Not measured"}`,
        ],
    },
    {
      icon: ShieldCheck,
      title: "EEAT",
      score: report.eeat.score,
      lines: [
        `Visible trust signals: ${eeatSignals.visibleCount ?? "N/A"}`,
        `Schema trust signals: ${eeatSignals.schemaCount ?? "N/A"}`,
        ...Object.entries(report.eeat.checks).filter(([, value]) => value).slice(0, 2).map(([key]) => formatScoreLabel(key)),
      ],
    },
    {
      icon: UserRound,
      title: "Entity Analysis",
      score: entityAuditScore,
      lines: [
        `Company: ${report.entities.companyName || "Not detected"}`,
        `Email: ${report.entities.emails[0] || "Not detected"}`,
        ...(report.entities.phones?.[0] ? [`Phone: ${report.entities.phones[0]}`] : []),
        ...(report.entities.address ? [`Location: ${report.entities.address}`] : report.entities.locations?.[0] ? [`Location: ${report.entities.locations[0]}`] : []),
        `Structured entity schema: ${report.entities.hasSchemaEntity ? "Present" : "Missing"}`,
        ...(serviceNames.length ? ["Services:", ...serviceNames.map((name) => `• ${name}`), ...(allServiceNames.length > serviceNames.length ? [`+${allServiceNames.length - serviceNames.length} more services`] : [])] : ["Services: Not detected"]),
        ...(productNames.length ? ["Products:", ...productNames.map((name) => `• ${name}`), ...(allProductNames.length > productNames.length ? [`+${allProductNames.length - productNames.length} more products`] : [])] : []),
      ],
    },
    {
      icon: Bot,
      title: "Crawler Access",
      score: report.robots.score,
      lines: [
        `robots.txt: ${report.robots.exists ? "Found" : "Missing"}`,
        ...(report.robots.scannerBlocked ? [`Scanner access: HTTP ${report.robots.scannerStatus}; verified with browser fallback`] : []),
        `Blocked bots: ${report.robots.blockedBots.join(", ") || "None detected"}`,
        report.sitemap.exists == null
          ? `Sitemap: Declared in robots.txt; verification incomplete`
          : `Sitemap URLs: ${report.sitemap.urlCount}`,
      ],
    },
  ];

  return (
    <section className={`${styles.pageContainer} mx-auto px-5 py-8 sm:px-8`}>
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="h-9 w-1 rounded-full bg-[#90ee9a]" />
            <h2 className="text-3xl font-semibold tracking-tight text-white">Technical Audit</h2>
          </div>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#d9e1d8]/68">
            Live crawl, structure, trust and performance checks that affect how AI systems understand this website.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#90ee9a]/24 bg-[#90ee9a]/8 px-4 py-2 text-sm font-semibold text-[#90ee9a]">
            <CheckCircle2 size={17} strokeWidth={2} aria-hidden="true" />
            {passed} passed
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/24 bg-rose-300/8 px-4 py-2 text-sm font-semibold text-rose-200">
            <CircleAlert size={17} strokeWidth={2} aria-hidden="true" />
            {attention} need attention
          </span>
          {notMeasured > 0 && <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-semibold text-[#d9e1d8]/65">{notMeasured} not measured</span>}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] bg-black p-5 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_center,rgba(144,238,154,.13)_1px,transparent_1.5px)] [background-size:20px_20px] [mask-image:linear-gradient(90deg,black,transparent_70%)]" />
        <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {checks.map(([key, value]) => (
            (() => {
              const measured = value != null;
              const passedCheck = value === true;
              const cardTone = !measured
                ? "border-white/10 bg-white/[.035]"
                : passedCheck
                  ? "border-[#90ee9a]/18 bg-[#90ee9a]/7 hover:border-[#90ee9a]/36"
                  : "border-rose-300/18 bg-rose-300/7 hover:border-rose-300/34";
              const iconTone = !measured
                ? "border-white/12 bg-white/[.05] text-[#d9e1d8]/60"
                : passedCheck
                  ? "border-[#90ee9a]/32 bg-[#90ee9a]/10 text-[#90ee9a]"
                  : "border-rose-300/32 bg-rose-300/10 text-rose-200";
              const labelTone = !measured ? "text-[#d9e1d8]/55" : passedCheck ? "text-[#90ee9a]" : "text-rose-200";
              return (
            <article
              key={key}
              className={`group flex min-h-24 items-center gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 ${cardTone}`}
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-full border ${iconTone}`}>
                {passedCheck ? <CheckCircle2 size={23} strokeWidth={1.9} aria-hidden="true" /> : <CircleAlert size={23} strokeWidth={1.9} aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{formatScoreLabel(key)}</p>
                <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.16em] ${labelTone}`}>
                  {!measured ? "Not measured" : passedCheck ? "Ready" : "Review"}
                </p>
              </div>
            </article>
              );
            })()
          ))}
        </div>

        <div className="relative mt-7 flex flex-col gap-4 border-t border-[#8B9C8C]/12 pt-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#90ee9a]/10 text-[#90ee9a]">
              <Sparkles size={24} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-xl font-semibold text-white">Audit Details</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#d9e1d8]/64">
                Focus first on low-scoring modules. These areas usually create the biggest lift in AI readability and trust.
              </p>
            </div>
          </div>
          <a href="#top-improvements" className="inline-flex w-fit items-center gap-3 rounded-full border border-[#90ee9a]/28 bg-[#90ee9a]/8 px-5 py-3 text-sm font-semibold text-[#9fe0a8] transition hover:border-[#90ee9a]/50 hover:bg-[#90ee9a]/14">
            View improvements
            <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </a>
        </div>

        <div className="relative mt-6 grid gap-4 lg:grid-cols-3">
          {auditCards.map((card) => (
            <AuditCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AuditCard({ title, score, lines, icon: Icon = FileText }) {
  const tone = auditTone(score);
  return (
    <article className="rounded-[1.4rem] bg-black p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className={`grid size-12 shrink-0 place-items-center rounded-2xl border ${tone.border} ${tone.bg} ${tone.icon}`}>
            <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-white">{title}</h3>
            <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone.text}`}>{tone.status}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-4xl font-semibold leading-none ${tone.text}`}>{Number.isFinite(score) ? score : "N/A"}</span>
          {Number.isFinite(score) && <span className="ml-1 text-sm text-[#d9e1d8]/55">/100</span>}
        </div>
      </div>
      <div className="mt-5 space-y-2 text-sm text-[#d9e1d8]/70">
        {lines.length ? lines.map((line) => <p key={line} className="[overflow-wrap:anywhere]">{line}</p>) : <p>No positive signals detected.</p>}
      </div>
      {Number.isFinite(score) && <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#8B9C8C]/12">
        <div className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`} style={{ width: `${Math.max(4, Math.min(100, score))}%` }} />
      </div>}
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function compactReportForEmail(report) {
  if (!report || typeof report !== "object") return {};
  return JSON.parse(JSON.stringify(report));
}

function EmailCapture({ report, compact = false, title = "Want a detailed AI Readiness Report?", description, buttonLabel, bare = false, showCallOption = true }) {
  const [confirmation, setConfirmation] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();

  async function onSubmit(values) {
    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          website: report.finalUrl,
          overallScore: report.overallScore,
          grade: report.grade,
          topImprovements: report.recommendations.slice(0, 5).map((item) => item.title),
          platformScores: Object.fromEntries(report.platformScores.map((item) => [item.platform, item.tier || "Not measured"])),
          wantsCall: Boolean(values.wantsCall),
          report: compactReportForEmail(report),
        }),
      });
      const data = await readApiResponse(response, "Could not send report. Please try again.");
      if (!response.ok) throw new Error(data.error || "Could not send report.");
      localStorage.setItem("scanSiteAIEmail", values.email);
      setConfirmation({ email: values.email, wantsCall: Boolean(values.wantsCall), emailSent: (data.delivery?.userSent ?? data.emailSent) !== false });
      if (data.emailSent === false) {
        toast.error(data.message || "Lead saved, but email delivery needs SMTP configuration.");
      } else {
        toast.success(data.message || "Report confirmation sent.");
      }
      reset();
    } catch (error) {
      toast.error(error?.message || "Could not save this lead right now.");
    }
  }

  if (confirmation) {
    const confirmationPanel = (
      <div className={`${bare ? "" : compact ? styles.compactCapture : styles.reportCapture} rounded-2xl border border-[#90ee9a]/22 bg-[#90ee9a]/[.07] p-5`} role="status" aria-live="polite">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full border border-[#90ee9a]/30 bg-[#90ee9a]/10 text-[#90ee9a]"><CheckCircle2 size={23} strokeWidth={2} aria-hidden="true" /></span>
          <div>
            <h3 className="text-lg font-semibold text-white">Thank you!</h3>
            <p className="mt-2 text-sm leading-6 text-[#d9e1d8]/75">
              {confirmation.emailSent ? <>Your complete report has been sent to <strong className="font-semibold text-white">{confirmation.email}</strong>.</> : <>Your request was saved, but email delivery is temporarily unavailable. Our team can still review your submission.</>}
            </p>
            {confirmation.wantsCall && <p className="mt-3 rounded-xl border border-[#90ee9a]/16 bg-black/20 p-3 text-sm font-medium leading-6 text-[#9fe0a8]">Your call request was received. Our team will contact you soon.</p>}
          </div>
        </div>
      </div>
    );
    if (compact) return confirmationPanel;
    return <Section title={title}>{confirmationPanel}</Section>;
  }

  const form = (
    <div className={bare ? "" : compact ? styles.compactCapture : styles.reportCapture}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        {!compact && description && <p className="text-sm leading-6 text-slate-300">{description}</p>}
        <div className={compact ? "grid gap-3" : "grid gap-4 md:grid-cols-[1fr_auto]"}>
          <div>
            <input
              {...register("email", { required: "Email is required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" } })}
              placeholder="you@company.com"
              className="h-14 w-full rounded-2xl border border-[#8B9C8C]/20 bg-black/30 px-5 text-white outline-none transition placeholder:text-[#8B9C8C]/60 focus:border-[#8B9C8C]"
            />
            {errors.email && <p className="mt-2 text-sm text-rose-300">{errors.email.message}</p>}
          </div>
          <button disabled={isSubmitting} className="h-14 cursor-pointer rounded-2xl bg-[#9fe0a8] px-6 font-semibold text-[#020302] shadow-[0_0_32px_rgba(159,224,168,.18)] transition hover:bg-[#b8f4bf] disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Sending..." : buttonLabel || (compact ? "Unlock Report" : "Send My Report")}
          </button>
        </div>
        {showCallOption && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#8B9C8C]/15 bg-white/[0.03] p-3 text-sm text-[#c7d0c6]">
            <input type="checkbox" {...register("wantsCall")} className="mt-1 size-4 accent-[#8B9C8C]" />
            <span>Schedule a call with us to review the AI readiness fixes.</span>
          </label>
        )}
      </form>
    </div>
  );

  if (compact) return form;

  return <Section title={title}>{form}</Section>;
}
const aiEngines = ["ChatGPT", "Claude", "Gemini", "Perplexity", "Copilot", "Grok", "DeepSeek", "Mistral"];

function findStoredEmail() {
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

  try {
    for (const storage of [localStorage, sessionStorage]) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        const value = key ? storage.getItem(key) : "";
        const match = String(value || "").match(emailPattern);
        if (match) return match[0].toLowerCase();
      }
    }
  } catch (error) {
    console.error("Stored email lookup failed", error);
  }

  return "";
}

async function getApproxLocationForScan() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) return null;
    const data = await response.json();

    return {
      ip: data.ip || "",
      city: data.city || "",
      region: data.region || "",
      country: data.country_name || data.country || "",
      postal: data.postal || "",
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      timezone: data.timezone || "",
      isp: data.org || "",
    };
  } catch (error) {
    console.error("Approx location lookup failed", error);
    return null;
  }
}

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [step, setStep] = useState(0);
  const [scanElapsed, setScanElapsed] = useState(0);
  const [scanFailure, setScanFailure] = useState(null);
  const router = useRouter();
  const { register, handleSubmit, control, formState: { errors } } = useForm({ defaultValues: { url: "", profile: "" } });
  const selectedProfile = useWatch({ control, name: "profile" });

  useEffect(() => {
    router.prefetch("/scan-report");
  }, [router]);

  async function onSubmit(values) {
    setScanFailure(null);
    setIsScanning(true);
    setStep(0);
    setScanElapsed(0);
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, scanSteps.length - 1)), 5500);
    const elapsedTimer = setInterval(() => setScanElapsed((current) => current + 1), 1000);
    try {
      const [storedEmail, approxLocation] = await Promise.all([
        Promise.resolve(findStoredEmail()),
        getApproxLocationForScan(),
      ]);
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: values.url, profile: values.profile, email: storedEmail, location: approxLocation }),
      });
      const data = await readApiResponse(response, "The live server returned an invalid scan response. Please try again.");
      if (!response.ok) {
        if (data.websiteFailure) setScanFailure({ title: "Website unavailable", message: data.error || "The website is unavailable.", httpStatus: data.httpStatus, score: 0 });
        throw new Error(data.error || "Scan failed.");
      }
      setStep(scanSteps.length - 1);
      sessionStorage.setItem("aiWebsiteReadinessReport", JSON.stringify(data.report));
      router.replace("/scan-report");
    } catch (error) {
      const rawMessage = error?.message || "We could not complete this scan.";
      const friendlyMessage = /getaddrinfo|\bEBUSY\b|ENOTFOUND|EAI_AGAIN/i.test(rawMessage)
        ? "We could not resolve this website's domain. It may be expired, temporarily unavailable, or incorrectly configured. Please verify the address and try again."
        : rawMessage;
      setScanFailure((current) => current || { title: "Scan could not be completed", message: friendlyMessage, httpStatus: null, score: null });
    } finally {
      clearInterval(timer);
      clearInterval(elapsedTimer);
      setIsScanning(false);
    }
  }

  return (
    <main className={styles.shell}>
      <Toaster position="top-right" toastOptions={{ style: { background: "#020617", color: "#fff", border: "1px solid rgba(255,255,255,.14)" } }} />
      <div className={`${styles.heroGrid} pointer-events-none absolute inset-0`} />
      <section className={`${styles.heroSection} relative mx-auto flex min-h-[92vh] w-full flex-col justify-center overflow-hidden px-5 pb-10 pt-24 sm:px-8 sm:pt-8`}>
        
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="absolute left-0 right-0 top-6 z-20 px-5 sm:px-8"
        >
          <SiteHeader className="mx-auto" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#8B9C8C]/20 bg-black/35 px-5 py-3 text-sm text-[#d9e1d8] shadow-2xl shadow-black/30 backdrop-blur-xl">
            <span className="grid size-6 place-items-center rounded-full border border-[#8B9C8C]/25 bg-[#8B9C8C]/10 text-[#90ee9a]">
              <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
            </span>
            AI crawler, LLM and answer-engine readiness audit
          </div>
          <h1 className={`${styles.heroTitle} mx-auto max-w-5xl text-[2.6rem] font-semibold leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-7xl`}>
            {homeH1.split(" AI Readiness")[0]}
            <span className={styles.titleAccent}> AI Readiness</span>
          </h1>
          <div className={styles.titleRule} />
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[#c7d0c6] sm:mt-7 sm:text-xl sm:leading-8">
           Analyze how <span className="text-white">ChatGPT</span>, <span className="text-white">Claude</span>,{" "}
            <span className="text-white">Gemini</span> &amp; <span className="text-white">Perplexity</span> understand,
            cite and recommend your website.
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-[#d9e1d8]/68 sm:text-base sm:leading-7">
            ScanSiteAI is an AI website readiness checker and audit platform for schema, crawler access, entity clarity,
            content structure and answer-engine visibility.
          </p>
        </motion.div>

        <motion.form
          id="scan-form"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          onSubmit={handleSubmit(onSubmit)}
          className="relative glow-border z-10 mx-auto mt-10 grid w-full max-w-[780px] gap-3 rounded-[24px] border border-white/15 bg-[#030604]/55 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.48),inset_0_0_0_1px_rgba(139,156,140,0.06)] backdrop-blur-[22px] sm:grid-cols-[1fr_auto]"
        >
          <div className="relative">
            
            <span className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-[#90ee9a]">
              <Globe2 size={30} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <input
              {...register("url", { required: "Website URL is required", validate: validateUrl })}
              placeholder="https://example.com"
              className="h-14 w-full rounded-3xl border border-transparent bg-transparent py-0 pl-16 pr-4 text-base text-white outline-none placeholder:text-white/34 sm:h-16 sm:pl-20 sm:pr-6 sm:text-lg"
            />
            {errors.url && <p className="px-4 pt-2 text-sm text-rose-300">{errors.url.message}</p>}
          </div>
          <button disabled={isScanning || !selectedProfile} className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#98d8a1] px-6 text-base font-semibold text-[#020302] shadow-[0_0_34px_rgba(152,216,161,.28)] transition hover:bg-[#aaf0b3] disabled:cursor-not-allowed disabled:opacity-45 sm:h-16 sm:px-8">
            <ArrowRight size={22} strokeWidth={2.2} aria-hidden="true" />
            {isScanning ? "Analyzing..." : selectedProfile ? "Analyze Website" : "Choose type first"}
          </button>
          <fieldset className="grid gap-2 border-t border-white/10 px-1 pb-0.5 pt-3 text-left sm:col-span-2">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#d9e1d8]/65">Website type <span className="normal-case tracking-normal text-[#8B9C8C]/65">· choose one</span></legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {websiteProfiles.map((profile) => {
                const selected = selectedProfile === profile.value;
                return (
                  <label key={profile.value} title={profile.copy} className="relative flex min-h-9 cursor-pointer items-center gap-2.5 px-2 py-1.5 transition hover:text-[#b8f4bf]">
                    <input type="radio" value={profile.value} {...register("profile", { required: "Choose a website type before scanning" })} className="sr-only" />
                    <span className={`grid size-4.5 shrink-0 place-items-center rounded-md border transition ${selected ? "border-[#90ee9a] bg-[#90ee9a] text-[#020302]" : "border-white/25 bg-white/[.03] text-transparent"}`}><CheckCircle2 size={12} strokeWidth={3} aria-hidden="true" /></span>
                    <strong className={`truncate text-xs font-semibold sm:text-sm ${selected ? "text-[#b8f4bf]" : "text-white"}`}>{profile.label}</strong>
                    <span className="sr-only">{profile.copy}</span>
                  </label>
                );
              })}
            </div>
            {errors.profile && <p className="px-1 text-sm font-medium text-rose-300">{errors.profile.message}</p>}
          </fieldset>
        </motion.form>

        <AnimatePresence>
          {scanFailure && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="relative z-10 mx-auto mt-5 flex w-full max-w-[780px] items-start gap-4 rounded-2xl border border-rose-300/25 bg-rose-300/[.08] p-5 pr-14 text-left">
              <span className="grid size-12 shrink-0 place-items-center rounded-full border border-rose-300/30 bg-rose-300/10 text-rose-200"><CircleAlert size={24} strokeWidth={2} aria-hidden="true" /></span>
              <div><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold text-white">{scanFailure.title}</h2>{scanFailure.score === 0 && <span className="rounded-full border border-rose-300/25 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-rose-200">Score 0</span>}</div><p className="mt-2 text-sm leading-6 text-[#d9e1d8]/75">{scanFailure.message}</p>{scanFailure.httpStatus && <p className="mt-2 text-xs text-rose-200/75">HTTP status: {scanFailure.httpStatus}</p>}</div>
              <button type="button" onClick={() => setScanFailure(null)} className="absolute right-4 top-4 grid size-9 cursor-pointer place-items-center rounded-full border border-rose-300/20 bg-black/20 text-rose-100 transition hover:bg-rose-300/15" aria-label="Close error message"><X size={18} strokeWidth={2} aria-hidden="true" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.7 }}
          className="relative z-10 mx-auto  mt-10 grid w-full max-w-[780px] gap-5 text-left sm:grid-cols-3 sm:gap-0"
        >
          {trustHighlights.map(([icon, title, copy], index) => (
            <div key={title} className={`flex items-center gap-2 px-2 sm:px-8`}>
              <span className="grid size-11 shrink-0 place-items-center rounded-full border border-[#90ee9a]/20 bg-[#90ee9a]/10 text-[#90ee9a]">
                <TrustIcon type={icon} />
              </span>
              <span>
                <strong className="block text-sm font-semibold text-[#8B9C8C]/70">{title}</strong>
                {/* <span className="mt-1 block text-sm leading-6 text-[#d9e1d8]/72">{copy}</span> */}
              </span>
            </div>
          ))}
        </motion.div>
          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 1 }}
          className="relative z-10 mx-auto mt-14 w-full max-w-[860px]"
        >
          <p className="mb-5 text-center font-mono text-[11px] uppercase tracking-[0.32em] text-[#8B9C8C]/70">
            Tested against every major answer engine
          </p>
          <div className="marquee-mask overflow-hidden">
            <div className="marquee-track flex w-max items-center gap-3 pr-3">
              {[...aiEngines, ...aiEngines].map((engine, i) => (
                <span
                  key={`${engine}-${i}`}
                  className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/[0.07] bg-white/[0.025] px-5 py-2.5 text-sm font-medium text-[#c7d0c6]/70 backdrop-blur-sm"
                >
                  <span className="size-1.5 rounded-full bg-[#90ee9a]/70 shadow-[0_0_8px_rgba(144,238,154,0.8)]" />
                  {engine}
                </span>
              ))}
            </div>
          </div>
        </motion.div>


        <AnimatePresence>{isScanning && <LoadingScan step={step} elapsed={scanElapsed} />}</AnimatePresence>
      </section>

      <section className={`${styles.pageContainer} relative z-10 mx-auto px-5 pb-12 pt-4 sm:px-8`} id="features">
        <div className={styles.sectionIntro}>
          <p>AI readiness audit</p>
          <h2 className={`${styles.heroTitle} text-3xl font-semibold text-white sm:text-5xl`}>
            A technical scan built for answer engines, not traditional SEO.
          </h2>
          <span>
            ScanSiteAI checks the signals modern AI systems need before they can crawl, understand, trust and recommend a website.
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className={styles.featureGrid}
        >
          {features.map(([icon, title, copy], index) => (
            <article key={title} className={styles.featureCard}>
              <div className={styles.featureIcon}><FeatureIcon type={icon} /></div>
              <div className="relative z-10">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8B9C8C]/70">
                  Signal {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d9e1d8]/72">{copy}</p>
              </div>
            </article>
          ))}
        </motion.div>
      </section>

      <section className={`${styles.pageContainer} relative z-10 mx-auto px-5 pb-12 sm:px-8`}>
        <div className={styles.productPanel} aria-labelledby="ai-friendly-overview">
          <div className={styles.productCopy}>
            <p className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.26em] text-[#8B9C8C]">
              <ScanSearch size={18} strokeWidth={1.8} aria-hidden="true" />
              AI-friendly website audit
            </p>
            <h2 id="ai-friendly-overview" className={`${styles.heroTitle} mt-4 text-3xl font-semibold leading-tight text-white sm:text-5xl`}>
              Find the hidden blockers that keep AI systems from trusting your website.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#d9e1d8]/78">
              Most websites are not ignored because of one big issue. They are skipped because business details are vague, crawler rules are unclear, schema is missing, or content is hard to quote in an answer.
            </p>
            <div className={styles.insightStats}>
              {insightStats.map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.scanFlowCard}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#8B9C8C]">Scan workflow</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">From URL to action plan</h3>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl bg-[#90ee9a]/10 text-[#90ee9a]">
                <Layers3 size={25} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
            <div className={styles.scanFlowList}>
              {scanFlow.map(([number, title, copy]) => (
                <article key={title} className={styles.flowStep}>
                  <span>{number}</span>
                  <div>
                    <h4>{title}</h4>
                    <p>{copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.pageContainer} relative z-10 mx-auto px-5 pb-12 sm:px-8`}>
        <div className={styles.answerEnginePanel}>
          <div className={styles.answerEngineHeader}>
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-[#8B9C8C]">Why AI tools care</p>
              <h2 className={`${styles.heroTitle} mt-3 text-3xl font-semibold text-white sm:text-4xl`}>
                AI visibility depends on clear facts, structure and trust.
              </h2>
            </div>
            <p>
              The report translates technical findings into plain-language priorities so founders, agencies and marketing teams know what to fix first.
            </p>
          </div>

          <div className={styles.signalList}>
            {[
              ["Clear business information", "Helps AI systems identify what your company does, where it operates and who it serves."],
              ["Answer-ready content", "Short definitions, FAQs, tables and structured sections make your content easier to quote."],
              ["Crawler permission", "robots.txt and sitemap signals confirm whether AI crawlers can discover important pages."],
            ].map(([title, copy]) => (
              <article key={title}>
                <CheckCircle2 size={22} strokeWidth={1.9} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>

          <div id="faq-preview" className={styles.faqPreview}>
            <div className={styles.faqLayout}>
              <div className={styles.faqIntro}>
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#8B9C8C]">FAQ</p>
                <h3 className={`${styles.heroTitle} mt-3 max-w-sm text-3xl font-semibold leading-tight text-white sm:text-4xl`}>
                  Questions website owners ask before running a scan.
                </h3>
                <p className={styles.faqIntroCopy}>Straight answers about what the scan measures, what the results mean and how to use them.</p>
              </div>
              <div className={styles.faqList}>
                {[
                  [
                    "Is this the same as regular SEO?",
                    "No. Regular SEO helps you rank higher on Google. This tool checks whether AI tools like ChatGPT and Gemini can understand your website well enough to use it in an answer.",
                  ],
                  [
                    "Can I get my results by email?",
                    "Yes. Once your scan is complete, enter your email and you will receive the complete report with the option to request a strategy call.",
                  ],
                  [
                    "What does it mean if AI tools cannot read my website?",
                    "It means AI tools may skip your site when answering questions, usually because of unclear content, missing trust signals or technical settings that limit discovery.",
                  ],
                  [
                    "Are the platform scores official ratings?",
                    "No. Platform scores are estimates derived from live technical signals such as schema, crawler access, content clarity, EEAT, entities and performance.",
                  ],
                ].map(([question, answer], index) => (
                  <details key={question} open={index === 0} className={`${styles.faqItem} group`}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-white marker:hidden sm:text-lg">
                      <span>{question}</span>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#90ee9a]/20 bg-[#90ee9a]/[.06] text-sm text-[#9fe0a8] transition group-open:rotate-45 group-open:bg-[#90ee9a]/15">
                        +
                      </span>
                    </summary>
                    <p className="mt-4 max-w-3xl pr-10 text-sm leading-7 text-[#d9e1d8]/72">
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.pageContainer} relative z-10 mx-auto px-5 pb-10 sm:px-8`}>
        <HeroCtaBand />

        <SiteFooter className="relative z-10 mx-auto mt-8 w-full" />
      </section>

    </main>
  );
}
