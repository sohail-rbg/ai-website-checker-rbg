import PublicInfoPage from "../_components/PublicInfoPage";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "Contact ScanSiteAI",
  description: "Contact ScanSiteAI for AI website readiness audits, implementation planning and LLM search visibility support.",
  path: "/contact",
  keywords: ["contact ScanSiteAI", "AI readiness consultation", "LLM visibility support", "AI search audit help"],
});

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contact"
      title="Turn your AI readiness report into a fix plan."
      description="Send your scan to ScanSiteAI and we will help prioritize the technical, content and trust updates that improve AI visibility."
      sections={[
        {
          heading: "Contact details",
          copy: "Reach the ScanSiteAI team for audit review, implementation planning and AI search visibility support.",
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
