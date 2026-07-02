import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Testimonials",
  description: "Testimonials and trust signal guidance for AI-ready websites.",
  alternates: { canonical: "/testimonials" },
};

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
