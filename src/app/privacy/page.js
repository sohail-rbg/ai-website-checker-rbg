import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "ScanSiteAI Privacy Policy",
  description: "Privacy policy for ScanSiteAI lead capture, demo requests and AI readiness report email delivery.",
  path: "/privacy",
  keywords: ["ScanSiteAI privacy", "AI audit privacy policy", "report email privacy", "website scan data policy"],
});

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy"
      title="Privacy policy."
      description="ScanSiteAI stores lead details only when a user requests a report by email."
      sections={[
        {
          heading: "Data collected",
          copy: "When you request a report, the application stores your email address, scanned website, overall score, summary and report data so the requested report can be delivered.",
        },
        {
          heading: "How data is used",
          copy: "Data is used for report delivery, admin notification and follow-up when a user asks to schedule a call. We do not sell lead data.",
        },
      ]}
    />
  );
}
