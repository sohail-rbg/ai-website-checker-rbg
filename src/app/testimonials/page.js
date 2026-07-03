import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "Trust Signals and Testimonials for AI-Ready Websites",
  description: "ScanSiteAI guidance for testimonials, proof points and trust signals that help AI systems evaluate websites.",
  path: "/testimonials",
  keywords: ["AI trust signals", "testimonials for AI search", "EEAT testimonials", "AI-ready website proof"],
});

export default function TestimonialsPage() {
  return (
    <PublicInfoPage
      eyebrow="Testimonials"
      title="Trust signals that help AI systems evaluate a website."
      description="Testimonials, case studies, named authors, editorial policies and clear provider information can improve confidence for answer engines."
      sections={[
        {
          heading: "Recommended trust content",
          copy: "Add real testimonials, customer proof, review schema where appropriate, author names, editorial policies and contact information. These signals support EEAT and entity confidence.",
        },
      ]}
    />
  );
}
