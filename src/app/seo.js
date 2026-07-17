export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scansiteai.com";
export const siteName = "ScanSiteAI";
export const contactEmail = "info@scansiteai.com";

export const defaultDescription =
  "See exactly why ChatGPT, Gemini, and Google AI Overviews might be skipping your site. Free live scan, no signup, results in minutes.";

export const defaultKeywords = [
  "ScanSiteAI",
  "AI website readiness checker",
  "AI website audit",
  "LLM SEO audit",
  "AI search optimization",
  "answer engine optimization",
  "ChatGPT website audit",
  "Claude crawler readiness",
  "Gemini AI search audit",
  "Perplexity visibility audit",
  "Google AI Overview optimization",
  "Microsoft Copilot readiness",
  "schema audit",
  "robots.txt AI crawlers",
  "sitemap audit",
  "EEAT audit",
  "entity recognition",
  "AI content readability",
];

export function createPageMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  image = "/logo.png",
  index = true,
  follow = true,
}) {
  const pageKeywords = [...new Set([...defaultKeywords, ...keywords])];

  return {
    title: { absolute: title },
    description,
    keywords: pageKeywords,
    alternates: { canonical: path },
    robots: { index, follow },
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      url: path,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${siteName} AI website readiness audit`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
