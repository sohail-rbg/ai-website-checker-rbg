import PublicInfoPage from "../_components/PublicInfoPage";

export const metadata = {
  title: "Coming Soon",
  description: "Login access for AI Website Readiness Checker is coming soon.",
  alternates: { canonical: "/coming-soon" },
};

export default function ComingSoonPage() {
  return (
    <PublicInfoPage
      eyebrow="Coming soon"
      title="Login access is coming soon."
      description="The current MVP focuses on live website scans, report delivery and demo requests. Login access will be available in a future release."
      sections={[
        {
          heading: "Need help now?",
          copy: "Book a demo or email sohail@rebrandgurus.com to review your AI readiness report with Rebrand Gurus.",
          items: ["Live AI readiness scan", "Detailed report by email", "Demo and consultation request"],
        },
      ]}
    />
  );
}
