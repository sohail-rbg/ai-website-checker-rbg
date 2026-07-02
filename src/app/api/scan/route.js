import { scanWebsite } from "@/lib/scanner";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request) {
  try {
    const rate = checkRateLimit(clientKey(request, "scan"), { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) {
      return Response.json(
        { error: "Scan limit reached. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } }
      );
    }
    const body = await request.json();
    const report = await scanWebsite(body.url);
    return Response.json({ report });
  } catch (error) {
    const message = error.message || "We could not scan this website. Please try again.";
    return Response.json({ error: message }, { status: 400 });
  }
}
