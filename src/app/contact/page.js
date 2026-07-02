import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Contact",
  description: "Contact Rebrand Gurus for AI website readiness audits and LLM search visibility support.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contact"
      title="Request help with your AI readiness report."
      description="Email Rebrand Gurus at sohail@rebrandgurus.com to review your scan, prioritize fixes and plan an AI search visibility roadmap."
      sections={[
        {
          heading: "Contact details",
          copy: "Provider: Rebrand Gurus. Founder and SaaS Architect: Md Sohail. Email: sohail@rebrandgurus.com. Service area: remote AI readiness audits for modern websites and SaaS teams.",
          items: ["Email: sohail@rebrandgurus.com", "Consultation: AI readiness strategy call", "Service: website audit and implementation guidance"],
        },
      ]}
    />
  );
}
