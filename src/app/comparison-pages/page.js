import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "Comparison Page Guidance for AI Search",
  description: "ScanSiteAI guidance for comparison pages that improve AI search visibility and answer-engine context.",
  path: "/comparison-pages",
  keywords: ["comparison page SEO", "AI answer comparison pages", "LLM product comparison content"],
});

export default function ComparisonPagesPage() {
  return (
    <PublicInfoPage
      eyebrow="Comparison pages"
      title="Comparison content for AI answer engines."
      description="Comparison pages help AI systems understand positioning, alternatives, use cases and decision criteria."
      sections={[
        {
          heading: "What to include",
          copy: "A useful comparison page explains who the product is for, what problem it solves, major alternatives, differentiators, pricing context, limitations and proof points.",
        },
      ]}
    />
  );
}
