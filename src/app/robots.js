const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scansiteai.com";

export default function robots() {
  const allowedBots = [
    "*",
    "Googlebot",
    "Google-Extended",
    "GPTBot",
    "ClaudeBot",
    "PerplexityBot",
    "CCBot",
    "Amazonbot",
    "Applebot",
    "Bingbot",
  ];

  return {
    rules: allowedBots.map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow: ["/api/", "/leads"],
    })),
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
