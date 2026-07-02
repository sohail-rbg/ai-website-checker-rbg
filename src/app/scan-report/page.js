"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import SiteFooter from "../_components/SiteFooter";
import SiteHeader from "../_components/SiteHeader";
import { Dashboard } from "../page";
import styles from "../page.module.css";

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return { date: "Not available", time: "Not available" };

  return {
    date: date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export default function ScanReportPage() {
  const [report, setReport] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("aiWebsiteReadinessReport");
      if (saved) setReport(JSON.parse(saved));
    } catch {
      toast.error("Could not load the report. Please run the scan again.");
    } finally {
      setReady(true);
    }
  }, []);

  const scanned = useMemo(() => formatDateTime(report?.scannedAt), [report]);

  if (!ready) {
    return (
      <main className={`${styles.shell} grid min-h-screen place-items-center px-5 text-center`}>
        <p className="text-[#d9e1d8]">Loading report...</p>
      </main>
    );
  }

  if (!report) {
    return (
      <main className={`${styles.shell} grid min-h-screen place-items-center px-5 text-center`}>
        <Toaster position="top-right" toastOptions={{ style: { background: "#020617", color: "#fff", border: "1px solid rgba(255,255,255,.14)" } }} />
        <section className={`${styles.glass} max-w-xl rounded-3xl p-8`}>
          <p className="text-sm uppercase tracking-[0.26em] text-[#8B9C8C]">No report found</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Run a scan to view the report.</h1>
          <p className="mt-3 text-sm leading-6 text-[#d9e1d8]/80">
            The report page opens after a successful website analysis.
          </p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-[#9fe0a8] px-5 py-3 text-sm font-bold text-[#020302]">
            Analyze Website
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <Toaster position="top-right" toastOptions={{ style: { background: "#020617", color: "#fff", border: "1px solid rgba(255,255,255,.14)" } }} />
      <div className={`${styles.heroGrid} pointer-events-none fixed inset-0`} />
      <section className={`${styles.pageContainer} relative z-10 mx-auto px-5 pb-2 pt-8 sm:px-8`}>
        <SiteHeader className="mx-auto mb-8 w-full" />
        <div className="flex flex-col gap-4 border-b border-[#8B9C8C]/15 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.26em] text-[#8B9C8C]">AI readiness report</p>
            <h1 className={`${styles.heroTitle} mt-2 text-3xl font-semibold text-white sm:text-5xl`}>
              Website Analysis Report
            </h1>
          </div>
          <Link href="/" className="inline-flex w-fit rounded-full border border-[#8B9C8C]/25 px-5 py-3 text-sm font-semibold text-[#d9e1d8] hover:bg-[#8B9C8C]/10">
            Run another scan
          </Link>
        </div>

        <div className="grid gap-3 py-6 text-sm sm:grid-cols-3">
          <div className={`${styles.softGlass} rounded-2xl p-4`}>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8B9C8C]">URL</p>
            <p className="mt-2 break-all font-semibold text-white">{report.finalUrl || report.scannedUrl}</p>
          </div>
          <div className={`${styles.softGlass} rounded-2xl p-4`}>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8B9C8C]">Date</p>
            <p className="mt-2 font-semibold text-white">{scanned.date}</p>
          </div>
          <div className={`${styles.softGlass} rounded-2xl p-4`}>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8B9C8C]">Time</p>
            <p className="mt-2 font-semibold text-white">{scanned.time}</p>
          </div>
        </div>
      </section>

      <Dashboard
        report={report}
        onReset={() => {
          sessionStorage.removeItem("aiWebsiteReadinessReport");
          window.location.href = "/";
        }}
      />
      <div className={`${styles.pageContainer} relative z-10 mx-auto px-5 pb-8 sm:px-8`}>
        <SiteFooter className="mx-auto w-full" />
      </div>
    </main>
  );
}
