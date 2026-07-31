import { blogPosts } from "./blog/posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scansiteai.com";

const routes = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.8, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
  { path: "/book-demo", priority: 0.8, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.5, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.5, changeFrequency: "monthly" },
  { path: "/resources", priority: 0.75, changeFrequency: "weekly" },
  { path: "/glossary", priority: 0.7, changeFrequency: "monthly" },
  { path: "/documentation", priority: 0.75, changeFrequency: "weekly" },
  { path: "/testimonials", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.75, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.5, changeFrequency: "monthly" },
  ...blogPosts.map((post) => ({
    path: `/blog/${post.slug}`,
    priority: 0.72,
    changeFrequency: "monthly",
  })),
];

export default function sitemap() {
  const lastModified = new Date("2026-07-31T00:00:00.000Z");

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
    images: path ? undefined : [`${siteUrl}/logo.png`],
  }));
}
