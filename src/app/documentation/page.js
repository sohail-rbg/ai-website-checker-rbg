import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Documentation",
  description: "Documentation for how AI Website Readiness Checker scans and scores public websites.",
  alternates: { canonical: "/documentation" },
};

export default function DocumentationPage() {
  return (
    <PublicInfoPage
      eyebrow="Documentation"
      title="How the AI readiness scan works."
      description="The scanner downloads public HTML, reads robots.txt and sitemap.xml, extracts page signals and calculates a weighted readiness score."
      sections={[
        {
          heading: "Analysis modules",
          copy: "The audit covers metadata, structured data, heading hierarchy, images, links, content structure, readability, EEAT signals, entity recognition, crawler access, sitemap discovery and Lighthouse performance when enabled.",
        },
        {
          heading: "Score calculation",
          copy: "Scores are weighted across metadata, schema, performance, content, EEAT, entities, robots, sitemap, links, images and readability. Platform scores are derived from those same technical signals.",
        },
      ]}
    />
  );
}
