import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Blog",
  description: "Blog topics for AI search visibility, schema, EEAT and LLM-friendly website content.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <PublicInfoPage
      eyebrow="Blog"
      title="AI search visibility insights."
      description="Practical guidance for making websites easier for AI systems and answer engines to crawl, parse and cite."
      sections={[
        {
          heading: "Topics we cover",
          copy: "AI crawler access, schema strategy, FAQ content, entity recognition, EEAT signals, sitemap hygiene, technical rendering and content structures that support retrieval.",
          items: ["LLM crawlability", "Answer-ready content", "Structured data", "AI Overview readiness"],
        },
      ]}
    />
  );
}
