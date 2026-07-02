import mongoose from "mongoose";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import Lead from "@/models/Lead";
import PrintButton from "./PrintButton";
import styles from "./report.module.css";

export const runtime = "nodejs";

function Field({ label, value }) {
  return (
    <div className={styles.field}>
      <span>{label}</span>
      <strong>{value || "Not detected"}</strong>
    </div>
  );
}

function formatScoreLabel(key) {
  if (key === "eeat") return "EEAT";
  return String(key || "").replace(/^\w/, (char) => char.toUpperCase());
}

export default async function ReportPage({ params }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectToDatabase();
  const lead = await Lead.findById(id).lean();
  if (!lead) notFound();

  const report = lead.report || {};
  const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
  const platforms = Array.isArray(report.platformScores) ? report.platformScores : [];
  const scoreBreakdown = report.scoreBreakdown || {};

  return (
    <main className={styles.page}>
      <div className={styles.actions}>
        <Link className={styles.action} href="/">Run New Scan</Link>
        <PrintButton className={styles.action} />
      </div>

      <section className={styles.hero}>
        <p>AI Website Readiness Checker</p>
        <h1>{lead.website}</h1>
        <div className={styles.score}>
          <strong>{lead.overallScore}</strong>
          <span>Overall Score / 100</span>
        </div>
      </section>

      <section className={styles.grid}>
        <Field label="Grade" value={report.grade} />
        <Field label="Final URL" value={report.finalUrl} />
        <Field label="Call Requested" value={lead.wantsCall ? "Yes" : "No"} />
        <Field label="Scanned At" value={report.scannedAt ? new Date(report.scannedAt).toLocaleString() : ""} />
      </section>

      <section className={styles.section}>
        <h2>AI Platform Scores</h2>
        <div className={styles.cards}>
          {platforms.map((item) => (
            <article key={item.platform}>
              <span>{item.platform}</span>
              <strong>{item.score}%</strong>
              <p>{item.status}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Score Breakdown</h2>
        <div className={styles.bars}>
          {Object.entries(scoreBreakdown).map(([key, value]) => (
            <div key={key}>
              <span>{formatScoreLabel(key)}</span>
              <div><i style={{ width: `${value}%` }} /></div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Detailed Recommendations</h2>
        <div className={styles.recommendations}>
          {recommendations.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <dl>
                <dt>Status</dt>
                <dd>{item.currentStatus}</dd>
                <dt>Why AI Cares</dt>
                <dd>{item.whyAiCares}</dd>
                <dt>How To Fix</dt>
                <dd>{item.howToFix}</dd>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
