import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "About ScanSiteAI",
  description: "Learn how ScanSiteAI helps websites become clearer, crawlable and trustworthy for AI search engines and LLM answer systems.",
  path: "/about",
  keywords: ["about ScanSiteAI", "AI search audit company", "LLM visibility platform", "AI readiness consultant"],
});

export default function AboutPage() {
  return (
    <PublicInfoPage
      eyebrow="About ScanSiteAI"
      title="ScanSiteAI helps websites become understandable to answer engines."
      description="The application was built for founders, agencies and marketing teams that need practical AI search visibility guidance from real technical signals."
      sections={[
        {
          heading: "What we believe",
          copy: "AI systems recommend websites that are crawlable, clearly structured, entity-rich and trustworthy. The checker turns those requirements into an actionable audit.",
          items: ["Live technical scans", "Schema and entity analysis", "EEAT and trust checks", "Prioritized recommendations"],
        },
        {
          heading: "Editorial policy",
          copy: "Reports are generated from observable website data such as HTML, robots.txt, sitemap.xml, metadata, links, structured data and performance signals. Recommendations explain why each issue matters for AI systems.",
        },
      ]}
    />
  );
}
