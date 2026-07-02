import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Terms",
  description: "Terms and conditions for using AI Website Readiness Checker.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Terms"
      title="Terms and conditions."
      description="Use AI Website Readiness Checker for public websites you are authorized to evaluate."
      sections={[
        {
          heading: "Use of the tool",
          copy: "The checker performs limited public technical analysis of a submitted URL and related public files such as robots.txt and sitemap.xml.",
        },
        {
          heading: "Report guidance",
          copy: "Scores and recommendations are technical estimates designed to guide implementation. They are not official rankings from OpenAI, Anthropic, Google, Microsoft, Perplexity or other platforms.",
        },
      ]}
    />
  );
}
