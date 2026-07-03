import HomeClient from "./_components/home/HomeClient";

export const metadata = {
  title: "AI Website Readiness Checker for ChatGPT, Claude, Gemini and AI Search",
  description:
    "Run a live AI website readiness audit for robots.txt, sitemap.xml, metadata, schema, content clarity, EEAT, entities, internal links, images and performance.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AI Website Readiness Checker",
    description:
      "Analyze whether ChatGPT, Claude, Gemini, Perplexity, Google AI Overview and Copilot can crawl, understand and recommend your website.",
    url: "/",
  },
  twitter: {
    title: "AI Website Readiness Checker",
    description:
      "Live AI search readiness audits for LLM crawlers, schema, content structure, EEAT and entity signals.",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
