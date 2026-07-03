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
      title="Turn your AI readiness report into a fix plan."
      description="Send your scan to ScanSite AI and we will help prioritize the technical, content and trust updates that improve AI visibility."
      sections={[
        {
          heading: "Contact details",
          copy: "Reach the ScanSite AI team for audit review, implementation planning and AI search visibility support.",
          items: ["Email: info@scansiteai.com", "Service area: remote AI readiness audits", "Best for: SaaS, agencies, service businesses and modern websites"],
        },
        {
          heading: "What to send",
          copy: "Share your website URL, the report link if you already ran a scan, and the business outcome you care about most, such as appearing in answer engines, improving crawler access or strengthening entity trust.",
          items: ["Website URL", "Report link", "Priority market or service", "Preferred call time"],
        },
        {
          heading: "How we help",
          copy: "We review the report, identify the highest-impact fixes and explain what should be handled by developers, content teams or business owners.",
          items: ["Schema roadmap", "Content structure guidance", "Crawler access checks", "EEAT and trust signal review"],
        },
      ]}
    />
  );
}
