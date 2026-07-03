"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  CircleAlert,
  Code2,
  Database,
  FileText,
  Globe2,
  Layers3,
  Lightbulb,
  Lock,
  Mail,
  RadioTower,
  RefreshCw,
  Repeat2,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Zap,
} from "lucide-react";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import { AmBarChart, AmOverallScoreChart, AmRadarChart, AmScoreRing } from "../charts/AmCharts";
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

function MetricIcon({ type }) {
  const icons = { redirect: Repeat2, beacon: RadioTower, globe: Globe2 };
  const Icon = icons[type] || Globe2;
  return <Icon size={38} strokeWidth={1.7} aria-hidden="true" />;
}

const trustHighlights = [
  ["bolt", "Quick Results", "Get actionable insights in minutes."],
  ["shield", "Secure & Private", "We never store your data."],
  ["lock", "No Signup Required", "Start your audit instantly without an account."],
];

const scanFlow = [
  ["01", "Crawl access", "Checks robots.txt, sitemap.xml, redirects, HTTPS and crawler permissions for major AI bots."],
  ["02", "Meaning extraction", "Reads metadata, schema, headings, internal links and entity signals so AI can classify the business."],
  ["03", "Trust scoring", "Reviews EEAT markers, contact signals, content clarity, readability and answer-ready structures."],
  ["04", "Action plan", "Prioritizes the few fixes most likely to improve AI visibility, with score gain and rationale."],
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

function SignalRow({ type, children }) {
  const positive = type === "positive";
  const Icon = positive ? CheckCircle2 : CircleAlert;
  return (
    <div className={`flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm ${positive ? "bg-black text-[#e9f7e9]" : "bg-amber-300/10 text-[#fff2bd]"}`}>
      <Icon size={17} strokeWidth={2} className={positive ? "text-[#90ee9a]" : "text-amber-300"} aria-hidden="true" />
      <span className="leading-5">{children}</span>
    </div>
  );
}

function PlatformScoresSection({ platforms, scannedLabel }) {
  return (
    <section className={`${styles.pageContainer} mx-auto px-5 py-10 sm:px-8`}>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-4">
            <span className="h-9 w-1 rounded-full bg-[#90ee9a]" />
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">AI Platform Scores</h2>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#d9e1d8]/68">
            Score overview across leading AI platforms based on website readiness and content intelligence.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[#90ee9a]/25 bg-[#90ee9a]/8 px-5 py-3 text-sm font-semibold text-[#90ee9a]">
          <ShieldCheck size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>Scanned on {scannedLabel}</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {platforms.map((platform) => {
          const tone = platformTone(platform.score);
          const strengths = platform.strengths.length ? platform.strengths.slice(0, 2) : ["No major strengths detected"];
          const weaknesses = platform.weaknesses.length ? platform.weaknesses.slice(0, 2) : ["No major gaps detected"];

          return (
            <article key={platform.platform} className="relative overflow-hidden rounded-[1.7rem]  bg-black p-6 shadow-[0_22px_60px_rgba(0,0,0,.24)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#90ee9a]/28 to-transparent" />
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-5">
                  <PlatformLogo platform={platform.platform} />
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold text-white">{platform.platform}</h3>
                    <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone.bg} ${tone.border} ${tone.text}`}>
                      {platform.status}
                    </span>
                  </div>
                </div>
                <div className="relative grid size-14 shrink-0 place-items-center">
                  <AmScoreRing score={platform.score} color={tone.color} className="absolute inset-0" />
                  <span className={`relative text-lg font-semibold leading-none ${tone.text}`}>{platform.score}%</span>
                </div>
              </div>

              <div className="grid gap-5">
                <div>
                  <p className="mb-2 text-sm text-[#d9e1d8]/78">Detected</p>
                  <div className="grid gap-2">
                    {strengths.map((item) => <SignalRow key={item} type="positive">{item}</SignalRow>)}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm text-[#d9e1d8]/78">Missing</p>
                  <div className="grid gap-2">
                    {weaknesses.map((item) => <SignalRow key={item}>{item}</SignalRow>)}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-5 rounded-[1.6rem] border border-[#8B9C8C]/16 bg-[linear-gradient(135deg,rgba(9,18,16,.92),rgba(4,8,7,.96))] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full border border-[#90ee9a]/22 bg-[#90ee9a]/8 text-[#90ee9a]">
            <Sparkles size={28} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-white">Improve Your AI Readiness</h3>
            <p className="mt-2 text-sm leading-6 text-[#d9e1d8]/68">
              Fix the missing elements to improve visibility across AI platforms and increase content trust.
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

function LoadingScan({ step }) {
  const progress = ((step + 1) / scanSteps.length) * 100;
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
          <h3 className="mt-2 text-base font-semibold leading-6 text-white">{scanSteps[step]}</h3>
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
      <div className={styles.bandWave} />
    </motion.div>
  );
}

export function Dashboard({ report, onReset }) {
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
  const visibleRecommendations = report.recommendations.slice(0, 1);
  const hiddenCount = Math.max(report.recommendations.length - 1, 0);
  const scannedAt = report.scannedAt ? new Date(report.scannedAt) : null;
  const scannedLabel = scannedAt && !Number.isNaN(scannedAt.getTime())
    ? scannedAt.toLocaleString()
    : "Just now";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-16">
      <section className={`${styles.pageContainer} mx-auto px-5 py-8 sm:px-8`}>
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <span className="h-9 w-1 rounded-full bg-[#90ee9a]" />
              <h2 className="text-3xl font-semibold tracking-tight text-white">Report Dashboard</h2>
            </div>
            <p className="mt-3 text-base text-[#d9e1d8]/72">Overview of your AI Website Readiness scan and next best action.</p>
          </div>
          <button onClick={onReset} className="inline-flex w-fit items-center gap-3 rounded-full border border-[#90ee9a]/25 bg-[#90ee9a]/8 px-5 py-3.5 text-sm font-semibold text-[#9fe0a8] transition hover:border-[#90ee9a]/50 hover:bg-[#90ee9a]/14">
            <RefreshCw size={21} strokeWidth={2} aria-hidden="true" />
            Run another scan
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-[#8B9C8C]/14 bg-[linear-gradient(135deg,rgba(9,20,17,.94),rgba(3,7,6,.97))] p-5 shadow-[0_24px_70px_rgba(0,0,0,.30)] sm:p-7">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,rgba(144,238,154,.14)_1px,transparent_1.5px)] [background-size:18px_18px] [mask-image:radial-gradient(circle_at_15%_28%,black,transparent_24%)]" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_27rem] xl:items-stretch">
            <div className="grid gap-7">
              <div className="grid gap-7 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-center">
                  <div className="relative mx-auto grid size-64 place-items-center overflow-visible rounded-full bg-[radial-gradient(circle,rgba(139,156,140,.08),transparent_64%)] lg:mx-0">
                    <div className="absolute inset-2 rounded-full border border-[#8B9C8C]/10" />
                    <AmOverallScoreChart score={report.overallScore} data={overallSegments} className="absolute inset-5" />
                  <div className="relative z-10 grid size-36 place-items-center rounded-full bg-[#020806] shadow-[inset_0_0_32px_rgba(0,0,0,.50)]">
                    <div className="text-center">
                      <div className="text-5xl font-semibold text-white">{report.overallScore}</div>
                      <div className="mt-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#90ee9a]">Grade {report.grade}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.32em] text-[#90ee9a]">
                    <span className="grid size-8 place-items-center rounded-full bg-[#90ee9a]/10">
                      <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
                    </span>
                    Overall Score
                  </p>
                  <h3 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl">AI Website Readiness</h3>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-[#d9e1d8]/78">
                    Calculated from live technical signals, structured data, content clarity, trust markers, crawler access and Lighthouse results.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["globe", "Scanned URL", report.finalUrl],
                  ["redirect", "Redirects", report.redirected ? "Detected" : "None detected"],
                  ["beacon", "Lighthouse", report.performance.fallback ? "Estimated from response" : report.performance.error ? "Could not complete" : "Completed"],
                ].map(([icon, label, value]) => (
                  <div key={label} className="rounded-[1.4rem] border border-[#8B9C8C]/14 bg-[#07100e]/78 p-5">
                    <span className="mb-5 block text-[#90ee9a]"><MetricIcon type={icon} /></span>
                    <p className="text-xs uppercase tracking-[0.28em] text-[#d9e1d8]/50">{label}</p>
                    <p className="mt-2 min-w-0 text-base font-semibold leading-snug text-white [overflow-wrap:anywhere]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 rounded-[1.35rem] border border-[#8B9C8C]/12 bg-[#07100e]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid size-14 place-items-center rounded-2xl bg-[#90ee9a]/10 text-[#90ee9a]">
                    <BadgeCheck size={30} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">Data is collected in real-time and analyzed using 50+ AI signals</p>
                    <p className="mt-1 text-sm text-[#d9e1d8]/58">Last scan: {scannedLabel}</p>
                  </div>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#8B9C8C]/14 bg-[#90ee9a]/8 px-4 py-2 text-sm font-semibold text-[#90ee9a]">
                  <span className="size-2.5 rounded-full bg-[#90ee9a]" />
                  Live
                </span>
              </div>
            </div>

            <aside className="relative flex min-h-[34rem] overflow-hidden rounded-[2rem] border border-[#8B9C8C]/16 bg-[linear-gradient(145deg,rgba(18,34,28,.96),rgba(4,8,6,.92)_58%)] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] sm:p-8">
              <div className="pointer-events-none absolute right-[-7rem] top-[-8rem] size-72 rounded-full bg-[#90ee9a]/10 blur-3xl" />
              <div className="relative flex w-full flex-col">
              <div className="mb-8 flex items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#90ee9a]">Complete report</p>
                  <h3 className="mt-6 text-3xl font-semibold leading-tight text-white sm:text-4xl">Send the full AI readiness report.</h3>
                  <p className="mt-5 text-base leading-8 text-[#d9e1d8]/74">Get the detailed report by email and request a strategy call with us.</p>
                </div>
                <span className="hidden size-16 shrink-0 place-items-center rounded-2xl border border-[#8B9C8C]/22 bg-[#90ee9a]/8 text-[#90ee9a] sm:grid">
                  <Mail size={31} strokeWidth={1.65} aria-hidden="true" />
                </span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#8B9C8C]/24 to-transparent" />
              <div className="mt-8">
                <EmailCapture report={report} compact bare buttonLabel="Send Report" />
              </div>
              <div className="mt-auto pt-7">
                <div className="flex items-start gap-3 rounded-2xl border border-[#90ee9a]/14 bg-black/20 p-4 text-sm leading-6 text-[#d9e1d8]/72">
                  <Lock className="mt-0.5 shrink-0 text-[#90ee9a]" size={18} strokeWidth={2} aria-hidden="true" />
                  <p>Your scan data is only used to generate this report and send your requested follow-up.</p>
                </div>
              </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <PlatformScoresSection platforms={report.platformScores} scannedLabel={scannedLabel} />

      <Section title="Score Breakdown">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="h-80 sm:h-96">
            <AmRadarChart data={radar} />
          </Card>
          <Card className="h-80 sm:h-96">
            <AmBarChart data={breakdown} />
          </Card>
        </div>
      </Section>

      <TechnicalAuditSection report={report} />

      <div id="top-improvements" />
      <Section title="Top Improvements">
        <div className="grid gap-4">
          {visibleRecommendations.map((item) => (
            <Card key={item.title}>
              <div className="grid gap-4 lg:grid-cols-[1fr_12rem]">
                <div>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <Info label="Current Status" value={item.currentStatus} />
                    <Info label="Why AI Cares" value={item.whyAiCares} />
                    <Info label="How To Fix" value={item.howToFix} />
                  </div>
                </div>
                <div className={`${styles.gainPanel} rounded-2xl p-4 text-sm`}>
                  <p className="text-[#c7d0c6]">Expected Score Gain</p>
                  <p className="mt-2 text-3xl font-semibold text-[#9fe0a8]">+{item.expectedGain}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8B9C8C]">Points</p>
                </div>
              </div>
            </Card>
          ))}
          {hiddenCount > 0 && (
            <div className={`${styles.lockedPanel} rounded-[2rem] p-6`}>
              <div className="relative grid gap-6 lg:grid-cols-[1fr_28rem] lg:items-center">
                <div>
                  <p className="text-sm uppercase tracking-[0.26em] text-[#d9e1d8]">More available</p>
                  <h3 className={`${styles.heroTitle} mt-3 text-3xl font-semibold text-white`}>
                    {hiddenCount} more AI-readiness fixes are ready.
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c7d0c6]">
                    Enter your email to receive the complete report with all recommendations, platform scores, technical checks and a call request flag for follow-up.
                  </p>
                  {report.quickWins.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {report.quickWins.slice(0, 3).map((item) => (
                        <span key={item.title} className="rounded-full border border-[#8B9C8C]/20 bg-[#8B9C8C]/10 px-3 py-1 text-xs text-[#d9e1d8]">
                          {item.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <EmailCapture report={report} compact />
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Content Opportunities">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {report.contentOpportunities.map((item) => (
            <div key={item.page} className={`${styles.softGlass} rounded-2xl p-4`}>
              <p className="font-semibold text-white">{item.page}</p>
              <p className={`mt-2 text-sm ${item.suggested ? "text-amber-200" : "text-emerald-200"}`}>{item.suggested ? "Suggested" : "Signal found"}</p>
            </div>
          ))}
        </div>
      </Section>

    </motion.div>
  );
}

function TechnicalAuditSection({ report }) {
  const checks = Object.entries(report.checklist || {});
  const passed = checks.filter(([, value]) => value).length;
  const attention = checks.length - passed;
  const auditCards = [
    {
      icon: Database,
      title: "Schema Audit",
      score: report.schema.score,
      lines: [
        `Present: ${report.schema.present.join(", ") || "None detected"}`,
        `Missing: ${report.schema.missing.slice(0, 4).join(", ") || "No major gaps"}`,
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
          "Estimated from live HTTP response",
          `Response time: ${report.performance.responseTimeMs}ms`,
          `HTML size: ${Math.round((report.performance.htmlBytes || 0) / 1024)}KB`,
        ]
        : [`Accessibility: ${report.performance.accessibility}`, `SEO: ${report.performance.seo}`, `Best Practices: ${report.performance.bestPractices}`],
    },
    {
      icon: ShieldCheck,
      title: "EEAT",
      score: report.eeat.score,
      lines: Object.entries(report.eeat.checks).filter(([, value]) => value).slice(0, 4).map(([key]) => formatScoreLabel(key)),
    },
    {
      icon: UserRound,
      title: "Entity Analysis",
      score: report.entities.score,
      lines: [
        `Company: ${report.entities.companyName || "Not detected"}`,
        `Email: ${report.entities.emails[0] || "Not detected"}`,
        `Services: ${report.entities.services.length}`,
      ],
    },
    {
      icon: Bot,
      title: "Crawler Access",
      score: report.robots.score,
      lines: [
        `robots.txt: ${report.robots.exists ? "Found" : "Missing"}`,
        `Blocked bots: ${report.robots.blockedBots.join(", ") || "None detected"}`,
        `Sitemap URLs: ${report.sitemap.urlCount}`,
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
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-[#8B9C8C]/14 bg-[linear-gradient(135deg,rgba(9,20,17,.92),rgba(3,7,6,.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_center,rgba(144,238,154,.13)_1px,transparent_1.5px)] [background-size:20px_20px] [mask-image:linear-gradient(90deg,black,transparent_70%)]" />
        <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {checks.map(([key, value]) => (
            <article
              key={key}
              className={`group flex min-h-24 items-center gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 ${
                value
                  ? "border-[#90ee9a]/18 bg-[#90ee9a]/7 hover:border-[#90ee9a]/36"
                  : "border-rose-300/18 bg-rose-300/7 hover:border-rose-300/34"
              }`}
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-full border ${value ? "border-[#90ee9a]/32 bg-[#90ee9a]/10 text-[#90ee9a]" : "border-rose-300/32 bg-rose-300/10 text-rose-200"}`}>
                {value ? <CheckCircle2 size={23} strokeWidth={1.9} aria-hidden="true" /> : <CircleAlert size={23} strokeWidth={1.9} aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{formatScoreLabel(key)}</p>
                <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.16em] ${value ? "text-[#90ee9a]" : "text-rose-200"}`}>
                  {value ? "Ready" : "Review"}
                </p>
              </div>
            </article>
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
    <article className="rounded-[1.4rem] border border-[#8B9C8C]/13 bg-[#07100e]/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
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
          <span className={`text-4xl font-semibold leading-none ${tone.text}`}>{score}</span>
          <span className="ml-1 text-sm text-[#d9e1d8]/55">/100</span>
        </div>
      </div>
      <div className="mt-5 space-y-2 text-sm text-[#d9e1d8]/70">
        {lines.length ? lines.map((line) => <p key={line} className="[overflow-wrap:anywhere]">{line}</p>) : <p>No positive signals detected.</p>}
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#8B9C8C]/12">
        <div className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`} style={{ width: `${Math.max(4, Math.min(100, Number(score) || 0))}%` }} />
      </div>
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

function EmailCapture({ report, compact = false, title = "Want a detailed AI Readiness Report?", description, buttonLabel, bare = false }) {
  const [reportUrl, setReportUrl] = useState("");
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
          platformScores: Object.fromEntries(report.platformScores.map((item) => [item.platform, item.score])),
          wantsCall: Boolean(values.wantsCall),
          report: compactReportForEmail(report),
        }),
      });
      const data = await readApiResponse(response, "Could not send report. Please try again.");
      if (!response.ok) throw new Error(data.error || "Could not send report.");
      if (data.reportUrl) setReportUrl(data.reportUrl);
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
          <button disabled={isSubmitting} className="h-14 rounded-2xl bg-[#8B9C8C] px-6 font-semibold text-[#020302] transition hover:bg-[#aab7ab] disabled:opacity-60">
            {isSubmitting ? "Sending..." : buttonLabel || (compact ? "Unlock Report" : "Send My Report")}
          </button>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#8B9C8C]/15 bg-white/[0.03] p-3 text-sm text-[#c7d0c6]">
          <input type="checkbox" {...register("wantsCall")} className="mt-1 size-4 accent-[#8B9C8C]" />
          <span>Schedule a call with us to review the AI readiness fixes.</span>
        </label>
        {reportUrl && (
          <a className="rounded-2xl border border-[#8B9C8C]/20 bg-[#8B9C8C]/10 p-3 text-sm font-semibold text-[#d9e1d8]" href={reportUrl} target="_blank" rel="noreferrer">
            Open hosted report
          </a>
        )}
      </form>
    </div>
  );

  if (compact) return form;

  return <Section title={title}>{form}</Section>;
}
const aiEngines = ["ChatGPT", "Claude", "Gemini", "Perplexity", "Copilot", "Grok", "DeepSeek", "Mistral"];

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { url: "" } });

  useEffect(() => {
    router.prefetch("/scan-report");
  }, [router]);

  async function onSubmit(values) {
    setIsScanning(true);
    setStep(0);
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, scanSteps.length - 1)), 1400);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: values.url }),
      });
      const data = await readApiResponse(response, "The live server returned an invalid scan response. Please try again.");
      if (!response.ok) throw new Error(data.error || "Scan failed.");
      setStep(scanSteps.length - 1);
      sessionStorage.setItem("aiWebsiteReadinessReport", JSON.stringify(data.report));
      router.replace("/scan-report");
    } catch (error) {
      toast.error(error.message);
    } finally {
      clearInterval(timer);
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
            Is Your Website
            <span className={styles.titleAccent}> Ready for AI?</span>
          </h1>
          <div className={styles.titleRule} />
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[#c7d0c6] sm:mt-7 sm:text-xl sm:leading-8">
           Analyze how <span className="text-white">ChatGPT</span>, <span className="text-white">Claude</span>,{" "}
            <span className="text-white">Gemini</span> &amp; <span className="text-white">Perplexity</span> understand,
            cite and recommend your website.
          </p>
        </motion.div>

        <motion.form
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
          <button disabled={isScanning} className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#98d8a1] px-6 text-base font-semibold text-[#020302] shadow-[0_0_34px_rgba(152,216,161,.28)] transition hover:bg-[#aaf0b3] disabled:cursor-wait disabled:opacity-70 sm:h-16 sm:px-8">
            <ArrowRight size={22} strokeWidth={2.2} aria-hidden="true" />
            {isScanning ? "Analyzing..." : "Analyze Website"}
          </button>
        </motion.form>

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


        <AnimatePresence>{isScanning && <LoadingScan step={step} />}</AnimatePresence>
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
            <div className="grid gap-3">
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

          <div id="faq-preview" className="mt-12 border-t border-[#8B9C8C]/15 pt-12">
            <div className="grid gap-4 pb-4 lg:grid-cols-[0.45fr_1fr] lg:gap-12">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#8B9C8C]">FAQ</p>
                <h3 className={`${styles.heroTitle} mt-3 max-w-sm text-3xl font-semibold leading-tight text-white sm:text-4xl`}>
                  Questions website owners ask before running a scan.
                </h3>
              </div>
              <div className="grid gap-4">
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
                  <details key={question} open={index === 0} className="group border-t border-[#8B9C8C]/12 py-6 first:border-t-0 first:pt-0">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold text-white marker:hidden">
                      <span>{question}</span>
                      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full border border-[#8B9C8C]/20 text-sm text-[#9fe0a8] transition group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-[#d9e1d8]/72">
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
