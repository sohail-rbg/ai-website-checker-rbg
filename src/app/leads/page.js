import { connectToDatabase } from "@/lib/db";
import Lead from "@/models/Lead";

export const runtime = "nodejs";

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
    .select("email website overallScore wantsCall emailSent submissionCount createdAt updatedAt lastSubmittedAt")
    .lean();

  return (
    <main className="min-h-screen bg-[#020302] px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-semibold">Leads</h1>
        <p className="mt-2 text-slate-400">Latest report requests and call requests.</p>
        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
          <table className="w-full min-w-[900px] border-collapse bg-white/[0.03] text-left text-sm">
            <thead className="bg-white/[0.06] text-slate-300">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">Website</th>
                <th className="p-4">Score</th>
                <th className="p-4">Call</th>
                <th className="p-4">Email Sent</th>
                <th className="p-4">Submits</th>
                <th className="p-4">Report</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={String(lead._id)} className="border-t border-white/10">
                  <td className="p-4">{lead.email}</td>
                  <td className="p-4">{lead.website}</td>
                  <td className="p-4">{lead.overallScore}</td>
                  <td className="p-4">{lead.wantsCall ? "Yes" : "No"}</td>
                  <td className="p-4">{lead.emailSent ? "Yes" : "No"}</td>
                  <td className="p-4">{lead.submissionCount}</td>
                  <td className="p-4"><a className="text-[#8B9C8C]" href={`/report/${lead._id}`}>Open</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
