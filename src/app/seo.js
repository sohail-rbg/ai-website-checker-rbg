export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scansiteai.com";
export const siteName = "ScanSiteAI";
export const contactEmail = "info@scansiteai.com";
export const pageTitles = Object.freeze({
  home: "AI Website Readiness Checker | ScanSiteAI",
  about: "How ScanSiteAI Helps Websites Improve AI Readiness",
  blog: "AI Search Visibility Insights and Guides | ScanSiteAI",
  bookDemo: "Book an AI Website Readiness Demo | ScanSiteAI",
  caseStudies: "AI Readiness Improvement Case Studies | ScanSiteAI",
  comingSoon: "ScanSiteAI Account Login - Coming Soon",
  comparisonPages: "AI Search Comparison Page Guidance | ScanSiteAI",
  contact: "Contact ScanSiteAI for AI Readiness Support",
  documentation: "How the AI Readiness Scan Works | ScanSiteAI",
  faq: "AI Website Readiness FAQ | ScanSiteAI",
  glossary: "AI Search Visibility Glossary | ScanSiteAI",
  leads: "Submitted Scan Report Emails | ScanSiteAI Admin",
  pricing: "Free AI Website Readiness Scan Pricing | ScanSiteAI",
  privacy: "ScanSiteAI Website Scan Privacy Policy",
  resources: "AI Website Readiness Resources | ScanSiteAI",
  scanReport: "AI Website Readiness Scan Report | ScanSiteAI",
  scans: "Saved Website Scans | ScanSiteAI Admin",
  terms: "ScanSiteAI Website Scanner Terms and Conditions",
  testimonials: "AI Website Readiness Testimonials | ScanSiteAI",
});
export const homeTitle = pageTitles.home;
export const homeH1 = "Check Your Website's AI Readiness";

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
