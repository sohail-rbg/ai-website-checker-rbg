import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "AI Website Readiness Glossary",
  description: "ScanSiteAI glossary of AI website readiness, answer engine optimization and LLM search visibility terms.",
  path: "/glossary",
  keywords: ["AI readiness glossary", "answer engine optimization terms", "LLM SEO definitions", "EEAT glossary"],
});

export default function GlossaryPage() {
  return (
    <PublicInfoPage
      eyebrow="Glossary"
      title="Definitions for AI search visibility."
      description="Plain-language definitions for the concepts measured by ScanSiteAI."
      sections={[
        {
          heading: "Important terms",
          copy: "AI readiness means a website is easy for answer engines to crawl, parse, trust and cite. Entity recognition means the system can identify the company, brand, products, services and contact details. Schema means machine-readable structured data such as Organization, Service, Product, FAQPage and BreadcrumbList.",
          items: ["AI readiness", "Entity recognition", "EEAT", "Structured data", "Robots.txt", "Sitemap.xml", "Answer engine optimization"],
        },
      ]}
    />
  );
}
