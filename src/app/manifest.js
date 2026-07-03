export default function manifest() {
  return {
    name: "ScanSiteAI",
    short_name: "ScanSiteAI",
    description: "Analyze whether AI systems can crawl, understand and recommend your website.",
    start_url: "/",
    display: "standalone",
    background_color: "#020302",
    theme_color: "#2E5E53",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
