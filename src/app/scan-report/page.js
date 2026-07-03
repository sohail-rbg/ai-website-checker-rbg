import ScanReportClient from "./ScanReportClient";

export const metadata = {
  title: "AI Website Readiness Scan Report",
  description:
    "View the AI Website Readiness Checker report with overall score, platform readiness, technical checks, recommendations and email delivery.",
  alternates: { canonical: "/scan-report" },
  robots: { index: false, follow: true },
  openGraph: {
    title: "AI Website Readiness Scan Report",
    description:
      "Review live AI readiness results for crawler access, structured data, EEAT, entity recognition and content clarity.",
    url: "/scan-report",
  },
  twitter: {
    title: "AI Website Readiness Scan Report",
    description:
      "Review a live AI readiness report with score breakdown, platform estimates and prioritized fixes.",
  },
};

export default function ScanReportPage() {
  return <ScanReportClient />;
}
