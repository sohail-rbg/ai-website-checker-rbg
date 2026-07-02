import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Glossary",
  description: "Glossary of AI website readiness, answer engine optimization and LLM search visibility terms.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  return (
    <PublicInfoPage
      eyebrow="Glossary"
      title="Definitions for AI search visibility."
      description="Plain-language definitions for the concepts measured by AI Website Readiness Checker."
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
