import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "AI Search Visibility Resources",
  description: "ScanSiteAI resources for improving AI search visibility, schema coverage, content clarity and LLM crawlability.",
  path: "/resources",
  keywords: ["AI search resources", "LLM crawlability checklist", "schema resources", "AI visibility checklist"],
});

export default function ResourcesPage() {
  return (
    <PublicInfoPage
      eyebrow="Resources"
      title="AI readiness resources for modern websites."
      description="Use these resources to improve crawler access, entity confidence, structured data and answer-ready content."
      sections={[
        {
          heading: "Implementation checklist",
          copy: "Start with robots.txt, sitemap.xml, canonical metadata, Organization schema, Service schema, FAQ content, About and Contact pages, concise definitions and descriptive internal links.",
          items: ["Publish sitemap.xml", "Allow AI crawlers", "Add Organization schema", "Write FAQ answers", "Expose contact details", "Improve heading hierarchy"],
        },
      ]}
    />
  );
}
