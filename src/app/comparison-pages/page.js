import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Comparison Pages",
  description: "Comparison page guidance for AI search visibility and answer-engine context.",
  alternates: { canonical: "/comparison-pages" },
};

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
