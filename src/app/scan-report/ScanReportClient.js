"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import SiteFooter from "../_components/SiteFooter";
import SiteHeader from "../_components/SiteHeader";
import { Dashboard } from "../_components/home/HomeClient";
import styles from "../page.module.css";

export default function ScanReportClient() {
  const [report, setReport] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = sessionStorage.getItem("aiWebsiteReadinessReport");
        if (saved) setReport(JSON.parse(saved));
      } catch {
        toast.error("Could not load the report. Please run the scan again.");
      } finally {
        setReady(true);
      }
    });
  }, []);

  if (!ready) {
    return (
      <main className={`${styles.shell} grid min-h-screen place-items-center px-5 text-center`}>
        <div>
          <h1 className="text-3xl font-semibold text-white">AI Website Readiness Report</h1>
          <p className="mt-3 text-[#d9e1d8]">Loading report...</p>
        </div>
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
      <section className={`${styles.pageContainer} relative z-10 mx-auto px-5 pt-8 sm:px-8`}>
        <SiteHeader className="mx-auto mb-8 w-full" />
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
