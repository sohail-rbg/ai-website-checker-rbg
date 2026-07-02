"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import toast, { Toaster } from "react-hot-toast";
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SiteHeader from "./_components/SiteHeader";
import SiteFooter from "./_components/SiteFooter";
import styles from "./page.module.css";

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
  return String(key || "").replace(/^\w/, (char) => char.toUpperCase());
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
    throw new Error(
      response.status === 504
        ? "The scan took too long on the live server. Please try a smaller site or try again."
        : fallbackMessage
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
  const common = { width: 38, height: 38, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (type === "robot") return <svg {...common}><rect x="5" y="8" width="14" height="10" rx="2" /><path d="M9 8V5h6v3" /><path d="M12 5V3" /><path d="M9 13h.01" /><path d="M15 13h.01" /><path d="M8 18v2" /><path d="M16 18v2" /><path d="M3 12h2" /><path d="M19 12h2" /></svg>;
  if (type === "code") return <svg {...common}><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m14 4-4 16" /></svg>;
  if (type === "database") return <svg {...common}><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>;
  if (type === "file") return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h4" /></svg>;
  if (type === "bulb") return <svg {...common}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M8.5 14.5a6 6 0 1 1 7 0c-.9.7-1.5 1.6-1.5 2.5h-4c0-.9-.6-1.8-1.5-2.5z" /><path d="M4 10h1" /><path d="M19 10h1" /><path d="M6.2 4.2l.7.7" /><path d="M17.1 4.9l.7-.7" /></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>;
}

function PlatformLogo({ platform }) {
  const common = {
    width: 34,
    height: 34,
    viewBox: "0 0 34 34",
    fill: "none",
    "aria-hidden": true,
  };

  if (platform === "ChatGPT") {
    return (
      <svg {...common}>
        <circle cx="17" cy="17" r="16" fill="#0f2f28" />
        <path d="M17 7.5 24.8 12v10L17 26.5 9.2 22V12z" stroke="#9fe0a8" strokeWidth="1.8" />
        <path d="M17 7.5v19M9.2 12l15.6 10M24.8 12 9.2 22" stroke="#9fe0a8" strokeWidth="1.2" opacity=".75" />
      </svg>
    );
  }

  if (platform === "Claude") {
    return (
      <svg {...common}>
        <circle cx="17" cy="17" r="16" fill="#2E241C" />
        <path d="M17 7 25 25H9z" fill="#D8B08C" />
        <path d="M17 11.5 21.3 23h-8.6z" fill="#020302" opacity=".38" />
      </svg>
    );
  }

  if (platform === "Gemini") {
    return (
      <svg {...common}>
        <circle cx="17" cy="17" r="16" fill="#152041" />
        <path d="M17 5c1.8 6.7 5.3 10.2 12 12-6.7 1.8-10.2 5.3-12 12-1.8-6.7-5.3-10.2-12-12 6.7-1.8 10.2-5.3 12-12z" fill="#8FB7FF" />
      </svg>
    );
  }

  if (platform === "Perplexity") {
    return (
      <svg {...common}>
        <circle cx="17" cy="17" r="16" fill="#062E2E" />
        <path d="M10 8h14v18H10zM10 17h14M17 8v18" stroke="#62D8D2" strokeWidth="2" />
      </svg>
    );
  }

  if (platform === "Google AI Overview") {
    return (
      <svg {...common}>
        <circle cx="17" cy="17" r="16" fill="#101418" />
        <path d="M17 6a11 11 0 1 0 10.4 14.6h-9.7v-6.2h16A16 16 0 1 1 29.2 6.8z" fill="#fff" opacity=".95" />
        <path d="M29.2 6.8 24.7 11A10.9 10.9 0 0 0 17 8.1V2a16 16 0 0 1 12.2 4.8z" fill="#8B9C8C" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="17" cy="17" r="16" fill="#17213F" />
      <path d="M7 9h9v9H7z" fill="#9fe0a8" />
      <path d="M18 9h9v9h-9z" fill="#8B9C8C" />
      <path d="M7 20h9v5H7z" fill="#67bfa5" />
      <path d="M18 20h9v5h-9z" fill="#d9e1d8" />
    </svg>
  );
}

function CircularScore({ score, grade }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
      <div
        className={`${styles.meter} grid size-32 shrink-0 place-items-center rounded-full sm:size-36`}
        style={{ "--score": `${score}%` }}
      >
        <div className="grid size-24 place-items-center rounded-full bg-slate-950 sm:size-28">
          <div className="text-center">
            <div className="text-3xl font-semibold text-white sm:text-4xl">{score}</div>
            <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Grade {grade}</div>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-[#8B9C8C]">Overall Score</p>
        <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">AI Website Readiness</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:mx-0">
          Calculated from live technical signals, structured data, content clarity, trust markers, crawler access and Lighthouse results.
        </p>
      </div>
    </div>
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
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3 5 6v5c0 4.4 2.9 8.5 7 10 4.1-1.5 7-5.6 7-10V6z" />
            <path d="m9.5 12.5 2 2 4-5" />
          </svg>
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
  const radar = breakdown.filter((item) => ["Metadata", "Schema", "Content", "EEAT", "Entities", "Robots", "Performance"].includes(item.name));
  const visibleRecommendations = report.recommendations.slice(0, 1);
  const hiddenCount = Math.max(report.recommendations.length - 1, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-16">
      <Section
        title="Report Dashboard"
        action={<button onClick={onReset} className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">Run another scan</button>}
      >
        <Card className="p-6">
          <CircularScore score={report.overallScore} grade={report.grade} />
          <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className={styles.softGlass + " rounded-2xl p-4"}>Scanned URL<br /><span className="text-white">{report.finalUrl}</span></div>
            <div className={styles.softGlass + " rounded-2xl p-4"}>Redirects<br /><span className="text-white">{report.redirected ? "Detected" : "None detected"}</span></div>
            <div className={styles.softGlass + " rounded-2xl p-4"}>Lighthouse<br /><span className="text-white">{report.performance.error ? "Could not complete" : "Completed"}</span></div>
          </div>
        </Card>
      </Section>

      <Section title="AI Platform Scores">
        <div className="grid gap-4 lg:grid-cols-3">
          {report.platformScores.map((platform) => (
            <Card key={platform.platform}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={styles.platformLogo}>
                    <PlatformLogo platform={platform.platform} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{platform.platform}</h3>
                    <p className="text-sm text-slate-400">{platform.status}</p>
                  </div>
                </div>
                <div className={`text-3xl font-semibold ${scoreColor(platform.score)}`}>{platform.score}%</div>
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <div>
                  <p className="mb-2 text-slate-400">Detected</p>
                  {platform.strengths.length ? platform.strengths.map((item) => <p key={item} className="rounded-xl bg-emerald-400/10 px-3 py-2 text-emerald-100">{item}</p>) : <p className="text-slate-500">No major strengths detected.</p>}
                </div>
                <div>
                  <p className="mb-2 text-slate-400">Missing</p>
                  {platform.weaknesses.length ? platform.weaknesses.map((item) => <p key={item} className="rounded-xl bg-amber-400/10 px-3 py-2 text-amber-100">{item}</p>) : <p className="text-slate-500">No major gaps detected.</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Score Breakdown">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="h-80 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke="rgba(255,255,255,.16)" />
                <PolarAngleAxis dataKey="name" stroke="#c7d0c6" />
                <PolarRadiusAxis stroke="#8B9C8C" />
                <Radar dataKey="value" stroke="#8B9C8C" fill="#2E5E53" fillOpacity={0.34} />
                <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,.16)", borderRadius: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="h-80 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown}>
                <XAxis dataKey="name" stroke="#aeb9ad" fontSize={11} interval={0} angle={-25} textAnchor="end" height={80} />
                <YAxis stroke="#aeb9ad" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,.16)", borderRadius: 12 }} />
                <Bar dataKey="value" fill="#8B9C8C" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </Section>

      <Section title="Technical Checklist">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(report.checklist).map(([key, value]) => (
            <div key={key} className={`${styles.softGlass} rounded-2xl p-4`}>
              <div className={`text-2xl ${value ? "text-emerald-300" : "text-rose-300"}`}>{value ? "✓" : "!"}</div>
              <p className="mt-2 text-sm font-medium text-white">{formatScoreLabel(key)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Audit Details">
        <div className="grid gap-5 lg:grid-cols-3">
          <AuditCard title="Schema Audit" score={report.schema.score} lines={[`Present: ${report.schema.present.join(", ") || "None"}`, `Missing: ${report.schema.missing.slice(0, 6).join(", ")}`, `Invalid blocks: ${report.schema.invalid.length}`]} />
          <AuditCard title="Content Audit" score={report.content.score} lines={[`Words: ${report.content.wordCount}`, `Average sentence: ${report.content.averageSentenceWords} words`, `FAQ detected: ${report.content.hasFAQ ? "Yes" : "No"}`]} />
          <AuditCard title="Performance" score={report.performance.performance} lines={[`Accessibility: ${report.performance.accessibility}`, `SEO: ${report.performance.seo}`, `Best Practices: ${report.performance.bestPractices}`]} />
          <AuditCard title="EEAT" score={report.eeat.score} lines={Object.entries(report.eeat.checks).filter(([, v]) => v).slice(0, 5).map(([k]) => k.replace(/([A-Z])/g, " $1"))} />
          <AuditCard title="Entity Analysis" score={report.entities.score} lines={[`Company: ${report.entities.companyName || "Not detected"}`, `Email: ${report.entities.emails[0] || "Not detected"}`, `Services: ${report.entities.services.length}`]} />
          <AuditCard title="Crawler Access" score={report.robots.score} lines={[`robots.txt: ${report.robots.exists ? "Found" : "Missing"}`, `Blocked bots: ${report.robots.blockedBots.join(", ") || "None detected"}`, `Sitemap URLs: ${report.sitemap.urlCount}`]} />
        </div>
      </Section>

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

      <EmailCapture
        report={report}
        title="Send the complete report"
        description="Get the detailed AI readiness report by email and request a strategy call with us."
      />
    </motion.div>
  );
}

function AuditCard({ title, score, lines }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className={`text-2xl font-semibold ${scoreColor(score)}`}>{score}</span>
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        {lines.length ? lines.map((line) => <p key={line}>{line}</p>) : <p>No positive signals detected.</p>}
      </div>
    </Card>
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

function EmailCapture({ report, compact = false, title = "Want a detailed AI Readiness Report?", description }) {
  const [reportUrl, setReportUrl] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();

  async function onSubmit(values) {
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
        report,
      }),
    });
    const data = await readApiResponse(response, "Could not send report. Please try again.");
    if (!response.ok) throw new Error(data.error || "Could not send report.");
    if (data.reportUrl) setReportUrl(data.reportUrl);
    toast.success(data.message);
    reset();
  }

  const form = (
    <div className={compact ? styles.compactCapture : styles.reportCapture}>
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
            {isSubmitting ? "Sending..." : compact ? "Unlock Report" : "Send My Report"}
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2v4" /><path d="M12 18v4" /><path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" />
              </svg>
            </span>
            AI crawler, LLM and answer-engine readiness audit
          </div>
          <h1 className={`${styles.heroTitle} mx-auto max-w-5xl text-[2.6rem] font-semibold leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-7xl`}>
            Is Your Website
            <span className={styles.titleAccent}> Ready for AI?</span>
          </h1>
          <div className={styles.titleRule} />
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[#c7d0c6] sm:mt-7 sm:text-xl sm:leading-8">
            Analyze how ChatGPT, Claude, Gemini, Perplexity and other AI systems understand your website.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          onSubmit={handleSubmit(onSubmit)}
          className="relative z-10 mx-auto mt-10 grid w-full max-w-[780px] gap-3 rounded-[24px] border border-white/15 bg-[#030604]/55 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.48),inset_0_0_0_1px_rgba(139,156,140,0.06)] backdrop-blur-[22px] sm:grid-cols-[1fr_auto]"
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-[#90ee9a]">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 0 20" /><path d="M12 2a15.3 15.3 0 0 0 0 20" />
              </svg>
            </span>
            <input
              {...register("url", { required: "Website URL is required", validate: validateUrl })}
              placeholder="https://example.com"
              className="h-14 w-full rounded-3xl border border-transparent bg-transparent py-0 pl-16 pr-4 text-base text-white outline-none placeholder:text-white/34 sm:h-16 sm:pl-20 sm:pr-6 sm:text-lg"
            />
            {errors.url && <p className="px-4 pt-2 text-sm text-rose-300">{errors.url.message}</p>}
          </div>
          <button disabled={isScanning} className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#98d8a1] px-6 text-base font-semibold text-[#020302] shadow-[0_0_34px_rgba(152,216,161,.28)] transition hover:bg-[#aaf0b3] disabled:cursor-wait disabled:opacity-70 sm:h-16 sm:px-8">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
            </svg>
            {isScanning ? "Analyzing..." : "Analyze Website"}
          </button>
        </motion.form>

        <AnimatePresence>{isScanning && <LoadingScan step={step} />}</AnimatePresence>
      </section>

      <section className={`${styles.pageContainer} relative z-10 mx-auto px-5 pb-10 sm:px-8`}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.7 }}
          className={`${styles.featureGrid} relative z-10 mx-auto mt-12 w-full`}
          id="features"
        >
          <h2 className={styles.featureHeading}>What the AI readiness audit checks</h2>
          {features.map(([icon, title, copy]) => (
            <article
              key={title}
              className={styles.featureCard}
            >
              <div className={styles.featureIcon}><FeatureIcon type={icon} /></div>
              <div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#d9e1d8]/78">{copy}</p>
              </div>
            </article>
          ))}
        </motion.div>
      </section>

      <section className={`${styles.pageContainer} relative z-10 mx-auto px-5 pb-10 sm:px-8`}>
        <section className={`${styles.aiContent} relative z-10 mx-auto mt-12 w-full`} aria-labelledby="ai-friendly-overview">
          <div>
            <p className="text-sm uppercase tracking-[0.26em] text-[#8B9C8C]">AI-friendly website audit</p>
            <h2 id="ai-friendly-overview" className={`${styles.heroTitle} mt-3 text-3xl font-semibold text-white sm:text-4xl`}>
              {`We Identify What's Holding Your Website Back From AI Search`}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#d9e1d8]/82">
              {`Most websites don't get ignored by AI tools on purpose; they get skipped because of small things that go unnoticed. Maybe your business details aren't clear enough. Maybe AI tools aren't even allowed to visit certain pages. Maybe your content is written in a way that's hard for AI to pull answers from. These issues don't always show up when a person visits your site, but they matter a lot to AI tools deciding whether to trust and use your website.`}
            </p>
            <p className="mt-3 text-sm leading-7 text-[#d9e1d8]/82">
              {`This tool goes through your website step by step and checks all the things that affect whether AI can read, understand and trust it. Once the check is done, you'll see a clear list of what's working, what's missing, and what's quietly holding your website back from showing up when people ask AI tools questions related to your business.`}
            </p>
            <p className="mt-3 text-sm leading-7 text-[#d9e1d8]/82">
              {`You won't need any technical knowledge to understand the results. Every issue is explained in simple terms, along with why it matters and what you can do to fix it.
`}
            </p>
          </div>

          <div className={styles.definitionPanel}>
            <h3 className="text-xl font-semibold text-white">Key definitions</h3>
            <dl className="mt-4 grid gap-4 text-sm leading-6 text-[#d9e1d8]/82">
              <div>
                <dt className="font-semibold text-[#9fe0a8]">AI readiness</dt>
                <dd>{`It means your website is easy for AI tools to read and understand. If your website is AI-ready, tools like ChatGPT or Gemini can pick it up and use it to answer someone's question.`}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#9fe0a8]">Business recognition</dt>
                <dd>{`This is about how clearly AI tools can figure out basic things about your business, like your name, what you do, who runs it, where you're located and how to contact you. The clearer this information is on your site, the easier it is for AI to recognize you.
`}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#9fe0a8]">Trust signals</dt>
                <dd>{`These are the things that tell AI (and real visitors) that your business is genuine. Things like an About page, a Contact page, a Privacy Policy, and clear ownership of your content. Websites with strong trust signals are more likely to be picked as a source by AI tools.`}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.signalTableWrap}>
            <table className={styles.signalTable}>
              <caption>Why AI Tools Care </caption>
              <thead>
                <tr>
                  <th>What We Check</th>
                  <th>Why It Matters</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Clear business information on your site</td>
                  <td>{`Helps AI tools understand what your business does and who it's for`}</td>
                </tr>
                <tr>
                  <td>{`Simple, clear answers to common questions`}</td>
                  <td>{`Gives AI ready-made content it can use when answering someone's question`}</td>
                </tr>
                <tr>
                  <td>{`Whether AI tools are allowed to visit your site`}</td>
                  <td>{`Confirms AI tools can actually access and read your pages`}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.faqPanel} id="faq-preview">
            <h3 className="text-xl font-semibold text-white">Frequently asked questions</h3>
            <details open>
              <summary>{`Is this the same as regular SEO?`}</summary>
              <p>{`No. Regular SEO helps you rank higher on Google. This tool checks something different: whether AI tools like ChatGPT and Gemini can understand your website well enough to use it when answering someone's question.`}</p>
            </details>
            <details>
              <summary>{`Can I get my results by email?`}</summary>
              <p>{`Yes. Once your scan is complete, just enter your email, and you'll receive your full report, along with the option to book a call if you want help fixing anything.`}</p>
            </details>
            <details>
              <summary>{`What does it mean if AI tools can't read my website?`}</summary>
              <p>{`It means AI tools may be skipping your website when answering questions, even if people can see and use your site normally. This usually happens because of missing information, unclear content, or technical settings blocking AI tools without you knowing.`}</p>
            </details>
            <details>
              <summary>{`Is this only useful for big businesses?`}</summary>
              <p>{`No. Any website owner, small business, freelancer or agency can use this to check if their site is ready for AI search and get simple steps to improve it.
`}</p>
            </details>
          </div>
        </section>
      </section>

      <section className={`${styles.pageContainer} relative z-10 mx-auto px-5 pb-10 sm:px-8`}>
        <HeroCtaBand />

        <SiteFooter className="relative z-10 mx-auto mt-8 w-full" />
      </section>

     
    </main>
  );
}
