import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import Lead from "@/models/Lead";
import Submission from "@/models/Submission";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  await connectToDatabase();
  const lead = await Lead.findById(id).lean();
  if (!lead) {
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  const submissionId = new URL(request.url).searchParams.get("submission");
  let submission = null;
  if (submissionId && mongoose.Types.ObjectId.isValid(submissionId)) {
    submission = await Submission.findOne({ _id: submissionId, lead: lead._id }).lean();
  }

  return Response.json({
    id: String(lead._id),
    submissionId: submission ? String(submission._id) : undefined,
    email: lead.email,
    website: submission?.website || lead.website,
    overallScore: submission?.overallScore ?? lead.overallScore,
    wantsCall: submission ? submission.wantsCall : lead.wantsCall,
    createdAt: submission?.submittedAt || lead.createdAt,
    report: submission?.report || lead.report,
  });
}
