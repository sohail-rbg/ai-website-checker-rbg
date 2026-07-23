import ScanReportClient from "./ScanReportClient";
import { createPageMetadata, pageTitles } from "../seo";

export const metadata = createPageMetadata({
  title: pageTitles.scanReport,
  description:
    "View a ScanSiteAI report with overall score, platform readiness, technical checks, recommendations and email delivery.",
  path: "/scan-report",
  keywords: ["AI readiness scan report", "AI platform score report", "LLM visibility report", "ScanSiteAI report"],
  index: false,
  follow: true,
});

export default function ScanReportPage() {
  return <ScanReportClient />;
}
