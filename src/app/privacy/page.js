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
      description="ScanSiteAI stores website scan records and lead details needed to generate reports and follow up when requested."
      sections={[
        {
          heading: "Data collected",
          copy: "When a scan is run, the application stores the scanned website, score, recommendations and report data in a private admin view. When you request a report, it also stores your email address and delivery details so the requested report can be sent.",
        },
        {
          heading: "How data is used",
          copy: "Data is used for report delivery, admin notification and follow-up when a user asks to schedule a call. We do not sell lead data.",
        },
      ]}
    />
  );
}
