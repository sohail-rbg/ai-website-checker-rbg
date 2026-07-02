export default function manifest() {
  return {
    name: "AI Website Readiness Checker",
    short_name: "AI Readiness",
    description: "Analyze whether AI systems can crawl, understand and recommend your website.",
    start_url: "/",
    display: "standalone",
    background_color: "#020302",
    theme_color: "#2E5E53",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
