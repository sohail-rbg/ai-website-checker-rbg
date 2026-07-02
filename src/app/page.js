"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
  ["AI Readiness", "Platform-specific signals for answer engines and LLM crawlers."],
  ["Technical Audit", "Robots, sitemap, HTTPS, metadata, links and renderability."],
  ["Schema Detection", "JSON-LD and microdata detection for major schema types."],
  ["Content Analysis", "Readability, page structure, FAQs, definitions and tables."],
  ["AI Recommendations", "Prioritized fixes with effort, rationale and score gain."],
  ["Entity Recognition", "Business, brand, contact, service and location extraction."],
];

const platformInitials = {
  ChatGPT: "CG",
  Claude: "CL",
  Gemini: "GM",
  Perplexity: "PX",
  "Google AI Overview": "AI",
  "Microsoft Copilot": "CP",
};

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
  if (score >= 60) return "text-cyan-300";
  if (score >= 45) return "text-amber-300";
  return "text-rose-300";
}

function Section({ title, children, action }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
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

function CircularScore({ score, grade }) {
  return (
    <div className="flex items-center gap-6">
      <div
        className={`${styles.meter} grid size-36 place-items-center rounded-full`}
        style={{ "--score": `${score}%` }}
      >
        <div className="grid size-28 place-items-center rounded-full bg-slate-950">
          <div className="text-center">
            <div className="text-4xl font-semibold text-white">{score}</div>
            <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Grade {grade}</div>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Overall Score</p>
        <h2 className="mt-2 text-4xl font-semibold text-white">AI Website Readiness</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
          Calculated from live technical signals, structured data, content clarity, trust markers, crawler access and Lighthouse results.
        </p>
      </div>
    </div>
  );
}

function LoadingScan({ step }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-10 max-w-3xl">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-200">Live Scan</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{scanSteps[step]}</h3>
          </div>
          <div className="size-12 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className={`${styles.progressLine} h-full rounded-full`}
            animate={{ width: `${((step + 1) / scanSteps.length) * 100}%` }}
          />
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {scanSteps.map((label, index) => (
            <div key={label} className={`rounded-2xl px-4 py-3 text-sm ${index <= step ? "bg-cyan-400/10 text-cyan-100" : "bg-white/5 text-slate-500"}`}>
              {label}
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function Dashboard({ report, onReset }) {
  const breakdown = useMemo(
    () => Object.entries(report.scoreBreakdown).map(([name, value]) => ({ name: name.replace(/^\w/, (c) => c.toUpperCase()), value })),
    [report]
  );
  const radar = breakdown.filter((item) => ["Metadata", "Schema", "Content", "Eeat", "Entities", "Robots", "Performance"].includes(item.name));
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
                  <div className="grid size-11 place-items-center rounded-2xl bg-white text-sm font-bold text-slate-950">{platformInitials[platform.platform]}</div>
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
          <Card className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke="rgba(255,255,255,.16)" />
                <PolarAngleAxis dataKey="name" stroke="#cbd5e1" />
                <PolarRadiusAxis stroke="#64748b" />
                <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.28} />
                <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,.16)", borderRadius: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-25} textAnchor="end" height={80} />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,.16)", borderRadius: 12 }} />
                <Bar dataKey="value" fill="#67e8f9" radius={[8, 8, 0, 0]} />
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
              <p className="mt-2 text-sm font-medium capitalize text-white">{key.replace(/([A-Z])/g, " $1")}</p>
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
              <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
                <div>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <Info label="Current Status" value={item.currentStatus} />
                    <Info label="Why AI Cares" value={item.whyAiCares} />
                    <Info label="How To Fix" value={item.howToFix} />
                  </div>
                </div>
                <div className={`${styles.softGlass} rounded-2xl p-4 text-sm`}>
                  <p className="text-slate-400">Difficulty</p>
                  <p className="font-semibold text-white">{item.difficulty}</p>
                  <p className="mt-3 text-slate-400">Estimated Time</p>
                  <p className="font-semibold text-white">{item.estimatedTime}</p>
                  <p className="mt-3 text-slate-400">Expected Score Gain</p>
                  <p className="text-xl font-semibold text-emerald-300">+{item.expectedGain} Points</p>
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
                </div>
                <EmailCapture report={report} compact />
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Quick Wins">
        <div className="grid gap-3 md:grid-cols-3">
          {report.quickWins.length ? report.quickWins.map((item) => (
            <div key={item.title} className={`${styles.softGlass} rounded-2xl p-4`}>
              <p className="font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm text-slate-400">{item.estimatedTime}</p>
            </div>
          )) : <p className="text-slate-400">No sub-30-minute quick wins were detected.</p>}
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
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not send report.");
    if (data.reportUrl) setReportUrl(data.reportUrl);
    toast.success(data.message);
    reset();
  }

  const form = (
    <Card className={compact ? "p-4" : ""}>
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
    </Card>
  );

  if (compact) return form;

  return <Section title={title}>{form}</Section>;
}

export default function Home() {
  const [report, setReport] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [step, setStep] = useState(0);
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { url: "" } });

  async function onSubmit(values) {
    setIsScanning(true);
    setReport(null);
    setStep(0);
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, scanSteps.length - 1)), 1400);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: values.url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Scan failed.");
      setReport(data.report);
      setStep(scanSteps.length - 1);
      toast.success("Website analysis complete.");
      setTimeout(() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }), 100);
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
      <section className="relative mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col justify-center overflow-hidden px-5 pb-16 pt-28 sm:px-8 sm:pt-32">
        <div className={styles.heroAura} />
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className={`${styles.logoSlot} absolute left-1/2 top-8 z-10 -translate-x-1/2 text-center`}
        >
          <Image src="/logo.png" alt="AI Readiness Logo" width={260} height={72} className="mx-auto h-14 w-auto sm:h-16" priority />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#8B9C8C]/20 bg-black/25 px-4 py-2 text-sm text-[#d9e1d8] shadow-2xl shadow-black/30 backdrop-blur-xl">
            <span className="size-2 rounded-full bg-[#8B9C8C] shadow-[0_0_18px_rgba(139,156,140,.8)]" />
            Live technical scan for AI answer engines
          </div>
          <h1 className={`${styles.heroTitle} mx-auto max-w-5xl text-5xl font-semibold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl`}>
            Is Your Website Ready for AI?
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-[#c7d0c6] sm:text-xl">
            Analyze how ChatGPT, Claude, Gemini, Perplexity and other AI systems understand your website.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          onSubmit={handleSubmit(onSubmit)}
          className={`${styles.glass} relative z-10 mx-auto mt-10 grid w-full max-w-4xl gap-3 rounded-[2rem] p-3 sm:grid-cols-[1fr_auto]`}
        >
          <div>
            <input
              {...register("url", { required: "Website URL is required", validate: validateUrl })}
              placeholder="https://example.com"
              className="h-16 w-full rounded-3xl border border-[#8B9C8C]/20 bg-black/30 px-6 text-lg text-white outline-none placeholder:text-[#8B9C8C]/60 focus:border-[#8B9C8C]"
            />
            {errors.url && <p className="px-4 pt-2 text-sm text-rose-300">{errors.url.message}</p>}
          </div>
          <button disabled={isScanning} className="h-16 rounded-3xl bg-[#8B9C8C] px-8 text-base font-semibold text-[#020302] transition hover:bg-[#aab7ab] disabled:cursor-wait disabled:opacity-70">
            {isScanning ? "Analyzing..." : "Analyze Website"}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.7 }}
          className={`${styles.featureRail} relative z-10 mx-auto mt-12 w-full max-w-6xl px-2 py-5`}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center">
          {features.map(([title, copy], index) => (
            <div
              key={title}
              className={`${styles.featureItem} max-w-[12rem]`}
            >
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[#aeb9ad]">{copy}</p>
            </div>
          ))}
          </div>
        </motion.div>

        <AnimatePresence>{isScanning && <LoadingScan step={step} />}</AnimatePresence>
      </section>

      <div id="report">{report && <Dashboard report={report} onReset={() => setReport(null)} />}</div>
    </main>
  );
}
