import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for AI Website Readiness Checker lead capture and report email delivery.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy"
      title="Privacy policy."
      description="AI Website Readiness Checker stores lead details only when a user requests a report by email."
      sections={[
        {
          heading: "Data collected",
          copy: "When you request a report, the application stores your email address, scanned website, overall score, summary and report data so the requested report can be delivered.",
        },
        {
          heading: "How data is used",
          copy: "Data is used for report delivery, admin notification and follow-up when a user asks to schedule a call. We do not sell lead data.",
        },
      ]}
    />
  );
}
