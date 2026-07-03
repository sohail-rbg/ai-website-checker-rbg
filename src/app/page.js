import HomeClient from "./_components/home/HomeClient";
import { createPageMetadata } from "./seo";

export const metadata = createPageMetadata({
  title: "ScanSiteAI - AI Website Readiness Checker for ChatGPT, Claude, Gemini and AI Search",
  description:
    "Run a live ScanSiteAI audit for robots.txt, sitemap.xml, metadata, schema, content clarity, EEAT, entities, internal links, images and performance.",
  path: "/",
  keywords: ["free AI website checker", "AI crawler audit", "LLM readiness report", "AI search visibility tool"],
});

export default function HomePage() {
  return <HomeClient />;
}
