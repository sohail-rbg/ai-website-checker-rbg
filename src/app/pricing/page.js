import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Pricing",
  description: "Pricing information for AI Website Readiness Checker reports and consultations.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <PublicInfoPage
      eyebrow="Pricing"
      title="Start with a free AI readiness scan."
      description="The MVP scan is free to run. Detailed implementation support and strategy calls can be discussed after reviewing the report."
      sections={[
        {
          heading: "What is included",
          copy: "The scanner provides an overall score, platform estimates, technical checks, schema findings, content analysis, entity extraction, EEAT checks and prioritized recommendations.",
        },
      ]}
    />
  );
}
