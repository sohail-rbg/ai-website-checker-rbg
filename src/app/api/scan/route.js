import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { connectToDatabase } from "@/lib/db";
import Scan from "@/models/Scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function errorResponse(message, status = 400) {
  return Response.json({ error: message }, { status });
}

async function saveScanRecord(request, report) {
  if (!process.env.MONGODB_URI) return null;

  try {
    await connectToDatabase();
    return await Scan.create({
      requestedUrl: report.scannedUrl,
      finalUrl: report.finalUrl,
      overallScore: report.overallScore,
      grade: report.grade,
      topRecommendations: (report.recommendations || []).slice(0, 5).map((item) => item.title),
      userAgent: request.headers.get("user-agent") || "",
      report,
      scannedAt: report.scannedAt ? new Date(report.scannedAt) : new Date(),
    });
  } catch (error) {
    console.error("Scan record save failed", error);
    return null;
  }
}

export async function POST(request) {
  try {
    const rate = checkRateLimit(clientKey(request, "scan"), { limit: 15, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) {
      return Response.json(
        { error: "Scan limit reached. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body. Please submit a website URL.", 400);
    }

    // Load the scanner inside the handler so live import/runtime failures still return JSON.
    const { scanWebsite } = await import("@/lib/scanner");
    const report = await scanWebsite(body?.url);
    const scanRecord = await saveScanRecord(request, report);
    return Response.json({ report, scanId: scanRecord ? String(scanRecord._id) : null });
  } catch (error) {
    const message = error?.message || "We could not scan this website. Please try again.";
    const isUserFixable = /(invalid|please enter|website url|offline|timeout|timed out|taking too long|too long to respond|blocked|ssl|private|localhost|unable to reach|could not reach)/i.test(message);
    if (isUserFixable) {
      console.warn("Scan request rejected", message);
    } else {
      console.error("Scan API failed", error);
    }
    return errorResponse(message, isUserFixable ? 400 : 500);
  }
}
