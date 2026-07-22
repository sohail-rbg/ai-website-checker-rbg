"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export default function PrintButton({ className, reportId, submissionId, website }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    if (downloading) return;
    setDownloading(true);
    try {
      const query = submissionId ? `?submission=${encodeURIComponent(submissionId)}` : "";
      const response = await fetch(`/api/report/${reportId}/pdf${query}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not generate PDF.");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const host = (() => { try { return new URL(website).hostname.replace(/^www\./, ""); } catch { return "website"; } })();
      anchor.href = href;
      anchor.download = `ScanSiteAI-${host}-readiness-report.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      window.alert(error?.message || "Could not generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button className={className} type="button" onClick={downloadPdf} disabled={downloading} aria-busy={downloading}>
      <Download size={18} aria-hidden="true" />
      {downloading ? "Preparing PDF…" : "Download PDF"}
    </button>
  );
}
