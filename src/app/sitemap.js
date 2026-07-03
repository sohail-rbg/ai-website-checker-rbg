const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scansiteai.com";

const routes = [
  ["", 1],
  ["/about", 0.8],
  ["/faq", 0.8],
  ["/contact", 0.8],
  ["/coming-soon", 0.4],
  ["/scan-report", 0.3],
  ["/privacy", 0.5],
  ["/terms", 0.5],
  ["/resources", 0.7],
  ["/glossary", 0.7],
  ["/documentation", 0.7],
  ["/case-studies", 0.6],
  ["/testimonials", 0.6],
  ["/comparison-pages", 0.6],
  ["/blog", 0.6],
  ["/pricing", 0.5],
];

export default function sitemap() {
  const lastModified = new Date("2026-07-02T00:00:00.000Z");

  return routes.map(([path, priority]) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path ? "monthly" : "weekly",
    priority,
    images: path ? undefined : [`${siteUrl}/logo.png`],
  }));
}
