import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "FAQ",
  description: "Frequently asked questions about AI website readiness, LLM search visibility and answer-engine audits.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <PublicInfoPage
      eyebrow="Frequently asked questions"
      title="FAQ for AI search and LLM readiness."
      description="Common questions about how the checker evaluates websites for AI systems and answer engines."
      sections={[
        {
          heading: "Is this traditional SEO?",
          copy: "No. The audit focuses on whether AI systems can crawl, parse, trust and recommend a website. Traditional SEO signals matter only when they support AI understanding.",
        },
        {
          heading: "Are scores random?",
          copy: "No. Scores are calculated from live technical checks including metadata, schema, robots, sitemap, content structure, entities, images, links, trust markers and performance when Lighthouse is enabled.",
        },
        {
          heading: "Which platforms are estimated?",
          copy: "The report estimates readiness for ChatGPT, Claude, Gemini, Perplexity, Google AI Overview and Microsoft Copilot. These are derived technical estimates, not official platform ratings.",
        },
      ]}
    />
  );
}
