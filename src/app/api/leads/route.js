import { connectToDatabase } from "@/lib/db";
import Lead from "@/models/Lead";

export const runtime = "nodejs";

function authorized(request) {
  const token = request.headers.get("x-admin-token") || new URL(request.url).searchParams.get("token");
  return Boolean(process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN);
}

export async function GET(request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDatabase();
  const leads = await Lead.find({})
    .sort({ updatedAt: -1 })
    .limit(100)
    .select("email website overallScore wantsCall emailSent submissionCount createdAt updatedAt lastSubmittedAt summary reportUrl report submissions")
    .lean();

  return Response.json({
    leads: leads.map((lead) => ({
      _id: String(lead._id),
      email: lead.email,
      website: lead.website,
      overallScore: lead.overallScore,
      wantsCall: lead.wantsCall,
      emailSent: lead.emailSent,
      submissionCount: lead.submissionCount,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      lastSubmittedAt: lead.lastSubmittedAt,
      summary: lead.summary,
      reportUrl: lead.reportUrl,
      hasReport: Boolean(lead.report && Object.keys(lead.report).length),
      storedSubmissions: Array.isArray(lead.submissions) ? lead.submissions.length : 0,
    })),
  });
}
