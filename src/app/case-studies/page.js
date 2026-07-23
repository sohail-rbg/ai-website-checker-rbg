import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata, pageTitles } from "../seo";

export const metadata = createPageMetadata({
  title: pageTitles.caseStudies,
  description: "Case study themes for ScanSiteAI readiness improvements and LLM-friendly website structure.",
  path: "/case-studies",
  keywords: ["AI readiness case studies", "LLM website improvements", "schema implementation examples"],
});

export default function CaseStudiesPage() {
  return (
    <PublicInfoPage
      eyebrow="Case studies"
      title="Common AI readiness improvement patterns."
      description="Most websites improve by clarifying their entity, adding schema, publishing trust pages and restructuring content into answer-ready sections."
      sections={[
        {
          heading: "Typical improvements",
          copy: "High-impact fixes include Organization schema, FAQPage schema, stronger About and Contact pages, visible service definitions, descriptive anchor text and a complete sitemap.",
          items: ["Business entity clarity", "Service page structure", "FAQ content", "Schema implementation"],
        },
      ]}
    />
  );
}
