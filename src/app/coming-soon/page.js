import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "ScanSiteAI Login Coming Soon",
  description: "Login access for ScanSiteAI is coming soon while the MVP focuses on live scans, report delivery and demo requests.",
  path: "/coming-soon",
  keywords: ["ScanSiteAI login", "AI readiness account", "AI audit dashboard coming soon"],
});

export default function ComingSoonPage() {
  return (
    <PublicInfoPage
      eyebrow="Coming soon"
      title="Login access is coming soon."
      description="The current MVP focuses on live website scans, report delivery and demo requests. Login access will be available in a future release."
      sections={[
        {
          heading: "Need help now?",
          copy: "Book a demo or email info@scansiteai.com to review your AI readiness report with ScanSiteAI.",
          items: ["Live AI readiness scan", "Detailed report by email", "Demo and consultation request"],
        },
      ]}
    />
  );
}
