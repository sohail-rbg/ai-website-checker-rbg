import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { connectToDatabase } from "@/lib/db";
import Scan from "@/models/Scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function errorResponse(message, status = 400) {
  return Response.json({ error: message }, { status });
}

function headerValue(request, names) {
  for (const name of names) {
    const value = request.headers.get(name);
    if (value) return decodeURIComponent(value);
  }
  return "";
}

function requestLocation(request) {
  return {
    city: headerValue(request, ["x-vercel-ip-city", "cf-ipcity"]),
    region: headerValue(request, ["x-vercel-ip-country-region", "cf-region"]),
    country: headerValue(request, ["x-vercel-ip-country", "cf-ipcountry"]),
  };
}

function cleanEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function cleanPhone(value) {
  const phone = String(value || "").replace(/[^\d+().\-\s]/g, "").replace(/\s+/g, " ").trim();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || /^(\d)\1+$/.test(digits)) return "";
  return /\d[\d\s().-]{7,}\d/.test(phone) ? phone.slice(0, 80) : "";
}

function cleanLocation(value) {
  if (!value || typeof value !== "object") return {};

  return {
    ip: String(value.ip || "").slice(0, 80),
    city: String(value.city || "").slice(0, 120),
    region: String(value.region || "").slice(0, 120),
    country: String(value.country || "").slice(0, 120),
    postal: String(value.postal || "").slice(0, 40),
    latitude: Number.isFinite(Number(value.latitude)) ? Number(value.latitude) : undefined,
    longitude: Number.isFinite(Number(value.longitude)) ? Number(value.longitude) : undefined,
    timezone: String(value.timezone || "").slice(0, 120),
    isp: String(value.isp || "").slice(0, 180),
  };
}

function browserFromUserAgent(userAgent) {
  const value = String(userAgent || "");
  const matchers = [
    ["Edge", /Edg\/([\d.]+)/],
    ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
    ["Chrome", /Chrome\/([\d.]+)/],
    ["Firefox", /Firefox\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  const match = matchers.find(([, pattern]) => pattern.test(value));
  if (!match) return { name: "Unknown", version: "" };
  const [, pattern] = match;
  return { name: match[0], version: value.match(pattern)?.[1] || "" };
}

async function saveScanRecord(request, report, body = {}) {
  if (!process.env.MONGODB_URI) return null;

  try {
    const userAgent = request.headers.get("user-agent") || "";
    const headerLocation = requestLocation(request);
    const clientLocation = cleanLocation(body.location);
    await connectToDatabase();
    return await Scan.create({
      requestedUrl: report.scannedUrl,
      finalUrl: report.finalUrl,
      email: cleanEmail(body.email),
      entityEmail: cleanEmail(report.entities?.emails?.[0]),
      entityPhone: cleanPhone(report.entities?.phones?.[0]),
      overallScore: report.overallScore,
      grade: report.grade,
      topRecommendations: (report.recommendations || []).slice(0, 5).map((item) => item.title),
      userAgent,
      browser: browserFromUserAgent(userAgent),
      location: { ...headerLocation, ...clientLocation },
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
    const scanRecord = await saveScanRecord(request, report, body);
    if (scanRecord) report.scanId = String(scanRecord._id);
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
