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
    .select("email website overallScore wantsCall emailSent submissionCount createdAt updatedAt lastSubmittedAt summary")
    .lean();

  return Response.json({
    leads: leads.map((lead) => ({
      ...lead,
      _id: String(lead._id),
    })),
  });
}
