import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Case Studies",
  description: "Case study themes for AI readiness improvements and LLM-friendly website structure.",
  alternates: { canonical: "/case-studies" },
};

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
