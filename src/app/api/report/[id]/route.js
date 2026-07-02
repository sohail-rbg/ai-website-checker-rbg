import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import Lead from "@/models/Lead";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  await connectToDatabase();
  const lead = await Lead.findById(id).lean();
  if (!lead) {
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  return Response.json({
    id: String(lead._id),
    email: lead.email,
    website: lead.website,
    overallScore: lead.overallScore,
    wantsCall: lead.wantsCall,
    createdAt: lead.createdAt,
    report: lead.report,
  });
}
