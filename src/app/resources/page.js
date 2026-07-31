import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata, pageTitles } from "../seo";

export const metadata = createPageMetadata({
  title: pageTitles.resources,
  description: "Practical AI search resources, checklists and content guidance for improving LLM crawlability, schema coverage and answer-engine visibility.",
  path: "/resources",
  keywords: [
    "AI search resources",
    "LLM crawlability checklist",
    "schema resources",
    "AI visibility checklist",
    "answer engine optimization checklist",
    "ChatGPT website visibility",
    "AI SEO checklist",
  ],
});

export default function ResourcesPage() {
  return (
    <PublicInfoPage
      eyebrow="Resources"
      title="AI search resources and readiness checklists."
      description="Use these practical guides to make your website easier for Google, ChatGPT, Gemini, Claude, Perplexity and other answer engines to discover, understand and reference."
      sections={[
        {
          heading: "AI visibility quick checklist",
          copy: "Start with the basics that make a website discoverable and understandable. Your important pages should be reachable through navigation or internal links, included in the sitemap, allowed by robots.txt and written in language your customers would actually search for.",
          items: [
            "Submit a clean sitemap.xml in Google Search Console",
            "Allow Googlebot and relevant AI crawlers to access public pages",
            "Use descriptive titles, H1s and meta descriptions",
            "Link important pages from the homepage or main navigation",
            "Avoid placeholder pages, duplicate pages and thin content",
          ],
        },
        {
          heading: "Content that answer engines can use",
          copy: "AI systems are more likely to reference pages that answer clear questions in a structured way. Each important page should explain the problem, the audience, the solution, the proof and the next step without forcing the reader to infer what the business does.",
          items: [
            "Add short definitions near the top of educational pages",
            "Use FAQs for real buyer and implementation questions",
            "Include examples, comparisons, limitations and use cases",
            "Write concise paragraphs that can stand alone in an answer",
            "Update pages when product features or positioning changes",
          ],
        },
        {
          heading: "Schema and machine-readable signals",
          copy: "Structured data helps machines confirm what is already visible on the page. Use schema to reinforce real content, not to invent claims. For most business websites, the best starting points are Organization, WebSite, BreadcrumbList, FAQPage, Service and Product schema when those entities are genuinely present.",
          items: [
            "Organization schema for brand, logo and contact identity",
            "WebSite schema for the main site entity",
            "BreadcrumbList schema for page hierarchy",
            "FAQPage schema for visible question-and-answer sections",
            "Service or Product schema for specific offerings",
          ],
        },
        {
          heading: "Trust signals to publish",
          copy: "Search engines and answer engines need confidence that the site represents a real business. Trust signals are especially important for new domains, SaaS tools, agencies, local businesses and sites asking users to submit URLs, emails or business information.",
          items: [
            "Clear About page with company purpose and audience",
            "Contact page with a real email or support channel",
            "Privacy policy and terms for data handling expectations",
            "Testimonials, demos, screenshots or examples where available",
            "Consistent brand name, logo and contact details across pages",
          ],
        },
        {
          heading: "Indexing and Search Console workflow",
          copy: "If a report looks low, check whether Google has indexed enough useful pages. In Google Search Console, review the Pages report, inspect important URLs and separate technical blockers from quality signals. A page that is crawled but not indexed often needs stronger content, clearer intent or better internal links.",
          items: [
            "Inspect the homepage and top landing pages individually",
            "Review Crawled - currently not indexed URLs",
            "Improve thin pages before requesting indexing again",
            "Remove weak URLs from the sitemap if they should not rank",
            "Track queries with impressions but low clicks for title improvements",
          ],
        },
        {
          heading: "Recommended page types",
          copy: "A small website can still perform well if every page has a job. For AI search visibility, prioritize pages that explain your product category, answer implementation questions and compare common alternatives. These pages create more opportunities for search impressions and AI citations.",
          items: [
            "AI website readiness checklist",
            "LLM SEO audit guide",
            "Robots.txt rules for AI crawlers",
            "Schema markup guide for AI search",
            "How to make a website visible in ChatGPT",
          ],
        },
      ]}
    />
  );
}
