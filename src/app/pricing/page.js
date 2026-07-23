import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata, pageTitles } from "../seo";

export const metadata = createPageMetadata({
  title: pageTitles.pricing,
  description: "Pricing information for ScanSiteAI reports, AI readiness consultations and implementation support.",
  path: "/pricing",
  keywords: ["ScanSiteAI pricing", "AI website audit pricing", "AI readiness report cost", "LLM SEO consultation"],
});

export default function PricingPage() {
  return (
    <PublicInfoPage
      eyebrow="Pricing"
      title="Start with a free AI readiness scan."
      description="The MVP scan is free to run. Detailed implementation support and strategy calls can be discussed after reviewing the report."
      sections={[
        {
          heading: "What is included",
          copy: "The scanner provides an overall score, platform estimates, technical checks, schema findings, content analysis, entity extraction, EEAT checks and prioritized recommendations.",
        },
      ]}
    />
  );
}
