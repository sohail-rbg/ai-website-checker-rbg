import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata, pageTitles } from "../seo";

export const metadata = createPageMetadata({
  title: pageTitles.documentation,
  description: "Learn how ScanSiteAI audits crawler access, metadata, schema, content structure, trust signals and AI search readiness scores.",
  path: "/documentation",
  keywords: [
    "ScanSiteAI documentation",
    "AI readiness scoring",
    "AI crawler analysis docs",
    "LLM audit methodology",
    "AI website audit methodology",
    "answer engine visibility scoring",
  ],
});

export default function DocumentationPage() {
  return (
    <PublicInfoPage
      eyebrow="Documentation"
      title="How ScanSiteAI measures AI website readiness."
      description="ScanSiteAI reviews the public signals that help search engines, answer engines and AI crawlers discover, understand and trust a website."
      sections={[
        {
          heading: "What the scan checks",
          copy: "The audit starts with signals that are visible to crawlers: robots.txt, sitemap.xml, page status, canonical metadata, titles, descriptions, headings, internal links, image alt text, structured data, readable content blocks and trust information. These checks help identify whether a public page can be found, parsed and understood by systems such as Google, ChatGPT, Claude, Gemini and Perplexity.",
          items: [
            "Crawler access and robots.txt rules",
            "Sitemap discovery and important URL coverage",
            "Title, description, canonical and robots metadata",
            "Heading hierarchy, internal links and image context",
            "Schema markup, entity clarity and trust signals",
          ],
        },
        {
          heading: "Crawler and sitemap review",
          copy: "ScanSiteAI checks whether important crawlers can access the site and whether a sitemap is available for discovery. A sitemap does not guarantee indexing, but it helps search engines find the URLs a site owner considers important. Robots.txt is reviewed for broad blocks, crawler-specific rules and accidental restrictions on pages that should appear in search or AI answers.",
          items: [
            "Googlebot and major AI crawler access",
            "Blocked paths that may affect discovery",
            "Sitemap availability and URL signals",
            "Public pages that should be easy to reach",
          ],
        },
        {
          heading: "Metadata and structured data",
          copy: "The scan reviews whether each page clearly describes itself to both humans and machines. Strong metadata helps search engines understand the topic of a page, while structured data gives explicit clues about the organization, services, products, FAQs, breadcrumbs and other important entities on the page.",
          items: [
            "Unique page titles and useful meta descriptions",
            "Canonical URLs and index/follow directives",
            "Organization, WebSite, Service and FAQPage schema",
            "Open Graph and social preview metadata",
          ],
        },
        {
          heading: "Content and entity clarity",
          copy: "Answer engines prefer content that is direct, specific and easy to quote. ScanSiteAI looks for clear explanations of who the website is for, what the company offers, where it operates, how users can contact it and whether key pages contain concise definitions, FAQs, examples and proof points.",
          items: [
            "Clear service and product descriptions",
            "Answer-ready sections with concise explanations",
            "Visible brand, business, location and contact details",
            "FAQ content that addresses real buyer questions",
          ],
        },
        {
          heading: "How scoring works",
          copy: "The overall readiness score is a directional benchmark, not an official rating from any AI platform. It weights technical access, metadata, schema coverage, content structure, readability, links, images, entity confidence, trust signals and performance indicators. Platform scores use the same public signals to estimate where a site may be easier or harder for different AI systems to interpret.",
          items: [
            "Technical access and crawlability",
            "Machine-readable structure and schema",
            "People-first content quality and clarity",
            "Trust, contact and business identity signals",
            "Performance and renderability where available",
          ],
        },
        {
          heading: "How to use the report",
          copy: "The best way to use a ScanSiteAI report is to fix issues in priority order: first remove discovery blockers, then improve metadata and schema, then expand thin pages into helpful content, and finally strengthen trust and internal linking. The goal is not to chase a perfect score; it is to make the site easier to find, understand and cite.",
          items: [
            "Fix crawler and indexing blockers first",
            "Improve titles, descriptions and internal links",
            "Add schema only where it matches visible page content",
            "Expand thin pages with useful, specific answers",
            "Re-scan after changes to confirm improvement",
          ],
        },
      ]}
    />
  );
}
