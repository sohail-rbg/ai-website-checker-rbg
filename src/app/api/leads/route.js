import { connectToDatabase } from "@/lib/db";
import Lead from "@/models/Lead";
import Submission from "@/models/Submission";

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
    .select("email website overallScore wantsCall emailSent submissionCount createdAt updatedAt lastSubmittedAt summary reportUrl report latestSubmission")
    .lean();
  const leadIds = leads.map((lead) => lead._id);
  const submissions = await Submission.find({ lead: { $in: leadIds } })
    .sort({ submittedAt: -1 })
    .limit(500)
    .select("lead email website overallScore grade wantsCall emailSent reportUrl submittedAt")
    .lean();

  const submissionCounts = submissions.reduce((counts, submission) => {
    const leadId = String(submission.lead);
    counts[leadId] = (counts[leadId] || 0) + 1;
    return counts;
  }, {});

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
      latestSubmission: lead.latestSubmission ? String(lead.latestSubmission) : null,
      storedSubmissions: submissionCounts[String(lead._id)] || 0,
    })),
    submissions: submissions.map((submission) => ({
      _id: String(submission._id),
      leadId: String(submission.lead),
      email: submission.email,
      website: submission.website,
      overallScore: submission.overallScore,
      grade: submission.grade,
      wantsCall: submission.wantsCall,
      emailSent: submission.emailSent,
      reportUrl: submission.reportUrl,
      submittedAt: submission.submittedAt,
    })),
  });
}
