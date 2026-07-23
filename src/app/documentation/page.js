import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata, pageTitles } from "../seo";

export const metadata = createPageMetadata({
  title: pageTitles.documentation,
  description: "Documentation for how ScanSiteAI scans and scores public websites for AI search and LLM readiness.",
  path: "/documentation",
  keywords: ["ScanSiteAI documentation", "AI readiness scoring", "AI crawler analysis docs", "LLM audit methodology"],
});

export default function DocumentationPage() {
  return (
    <PublicInfoPage
      eyebrow="Documentation"
      title="How the AI readiness scan works."
      description="The scanner downloads public HTML, reads robots.txt and sitemap.xml, extracts page signals and calculates a weighted readiness score."
      sections={[
        {
          heading: "Analysis modules",
          copy: "The audit covers metadata, structured data, heading hierarchy, images, links, content structure, readability, EEAT signals, entity recognition, crawler access, sitemap discovery and Lighthouse performance when enabled.",
        },
        {
          heading: "Score calculation",
          copy: "Scores are weighted across metadata, schema, performance, content, EEAT, entities, robots, sitemap, links, images and readability. Platform scores are derived from those same technical signals.",
        },
      ]}
    />
  );
}
