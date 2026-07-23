import Link from "next/link";
import { connectToDatabase } from "@/lib/db";
import Lead from "@/models/Lead";
import Submission from "@/models/Submission";
import { createPageMetadata, pageTitles } from "../seo";
import LeadsDataTable from "./LeadsDataTable";

export const runtime = "nodejs";
export const metadata = createPageMetadata({
  title: pageTitles.leads,
  description: "Protected lead management view for ScanSiteAI report requests, demo follow-ups and complete report links.",
  path: "/leads",
  keywords: ["ScanSiteAI leads", "AI report requests", "protected lead inbox"],
  index: false,
  follow: false,
});

export default async function LeadsPage({ searchParams }) {
  const params = await searchParams;
  const token = params?.token;

  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return (
      <main className="min-h-screen bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-semibold">Protected Leads</h1>
          <p className="mt-3 text-slate-300">Add a valid admin token in the URL to view leads.</p>
        </div>
      </main>
    );
  }

  await connectToDatabase();
  const leads = await Lead.find({})
    .sort({ updatedAt: -1 })
    .limit(100)
    .select("email website overallScore wantsCall emailSent submissionCount createdAt updatedAt lastSubmittedAt reportUrl report")
    .lean();

  const leadIds = leads.map((lead) => lead._id);
  const submissions = await Submission.find({ lead: { $in: leadIds } })
    .sort({ submittedAt: -1 })
    .limit(500)
    .select("lead email website overallScore grade wantsCall emailSent submittedAt report")
    .lean();

  const leadIdsWithSubmissions = new Set(submissions.map((submission) => String(submission.lead)));
  const submissionEntries = submissions.map((submission) => ({
    id: String(submission._id),
    leadId: String(submission.lead),
    submissionId: String(submission._id),
    email: submission.email,
    website: submission.website,
    overallScore: submission.overallScore,
    grade: submission.grade || submission.report?.grade || "N/A",
    wantsCall: Boolean(submission.wantsCall),
    emailSent: Boolean(submission.emailSent),
    submittedAt: submission.submittedAt,
    hasReport: Boolean(submission.report && Object.keys(submission.report).length),
  }));

  const legacyEntries = leads
    .filter((lead) => !leadIdsWithSubmissions.has(String(lead._id)))
    .map((lead) => {
      const leadId = String(lead._id);

      return {
        id: leadId,
        leadId,
        submissionId: "",
        email: lead.email,
        website: lead.website,
        overallScore: lead.overallScore,
        grade: lead.report?.grade || "N/A",
        wantsCall: Boolean(lead.wantsCall),
        emailSent: Boolean(lead.emailSent),
        submittedAt: lead.lastSubmittedAt || lead.createdAt,
        hasReport: Boolean(lead.report && Object.keys(lead.report).length),
      };
    });

  const entries = [...submissionEntries, ...legacyEntries]
    .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
    .map((entry) => ({
      ...entry,
      submittedAt: entry.submittedAt ? new Date(entry.submittedAt).toISOString() : null,
      reportHref: entry.submissionId ? `/report/${entry.leadId}?submission=${entry.submissionId}` : `/report/${entry.leadId}`,
      searchText: `${entry.email} ${entry.website} ${entry.grade} ${entry.wantsCall ? "call" : "no call"} ${entry.emailSent ? "sent" : "pending"}`.toLowerCase(),
    }));

  const callRequests = entries.filter((entry) => entry.wantsCall).length;
  const sentReports = entries.filter((entry) => entry.emailSent).length;

  return (
    <main className="min-h-screen bg-[#020302] px-5 py-10 text-white sm:px-8">
      <section className="mx-auto max-w-[1300px]">
        <div className="flex flex-col gap-5 border-b border-[#8B9C8C]/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#8B9C8C]">Lead Inbox</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Submitted Emails</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d9e1d8]/72">
              Review every report request with date, time, website, score and the complete report link.
            </p>
          </div>
          <Link href="/" className="inline-flex w-fit rounded-full bg-[#9fe0a8] px-5 py-3 text-sm font-bold text-[#020302]">
            Run New Scan
          </Link>
        </div>

        <div className="grid gap-4 py-8 sm:grid-cols-3">
          {[
            ["Total entries", entries.length],
            ["Reports sent", sentReports],
            ["Call requests", callRequests],
          ].map(([label, value]) => (
            <div key={label} className="border-l border-[#8B9C8C]/20 py-1 pl-5">
              <p className="text-3xl font-semibold text-[#9fe0a8]">{value}</p>
              <p className="mt-1 text-sm text-[#d9e1d8]/62">{label}</p>
            </div>
          ))}
        </div>

        <LeadsDataTable rows={entries} />
      </section>
    </main>
  );
}
