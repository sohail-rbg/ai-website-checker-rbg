import HomeClient from "./_components/home/HomeClient";
import { createPageMetadata } from "./seo";

export const metadata = createPageMetadata({
  title: "ScanSiteAI – Free AI Website Readiness Checker",
  description:
    "See exactly why ChatGPT, Gemini, and Google AI Overviews might be skipping your site. Free live scan, no signup, results in minutes.",
  path: "/",
  keywords: ["free AI website checker", "AI crawler audit", "LLM readiness report", "AI search visibility tool"],
});

export default function HomePage() {
  return <HomeClient />;
}
