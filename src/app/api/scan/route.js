import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { connectToDatabase } from "@/lib/db";
import Scan from "@/models/Scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const WEBSITE_PROFILES = new Set(["local_business", "saas", "ecommerce", "publisher", "agency", "api"]);

function errorResponse(message, status = 400) {
  return Response.json({ error: message }, { status });
}

function userFacingScanError(error) {
  const message = String(error?.message || "");
  const status = Number(error?.httpStatus) || null;
  if (/reserved example domain/i.test(message)) return "This is an example domain, not a live business website. Please enter the website you want to audit.";
  if (/expired|awaiting renewal/i.test(message)) return "This domain appears to have expired. Renew the domain or enter another website.";
  if (/parked|listed for sale|buy this domain/i.test(message)) return "This domain is parked or for sale, so there is no active website to scan.";
  if (/suspended|not configured on its hosting/i.test(message)) return "This website appears to be suspended. Please contact the hosting provider and try again after it is restored.";
  if (/soft-404|page-not-found/i.test(message) || status === 404 || status === 410) return "We could not find a working homepage at this address. Check the URL or restore the missing page.";
  if (status === 401 || status === 403 || /blocked automated scanning|does not allow automated/i.test(message)) return "This website blocked the scan. The site owner may need to allow ScanSiteAI through its firewall, security plugin, or bot-protection settings.";
  if (/getaddrinfo|\bEBUSY\b|ENOTFOUND|EAI_AGAIN|could not be resolved|failure stage: dns/i.test(message)) return "We could not find this domain. Check the spelling and confirm that the domain is active.";
  if (/certificate|\bSSL\b|\bTLS\b|failure stage: tls/i.test(message)) return "This website has a security-certificate problem. Ask the site owner or hosting provider to fix the HTTPS certificate.";
  if (/too many redirects/i.test(message)) return "This website redirects too many times and cannot be scanned. Check its domain and HTTPS redirect settings.";
  if (/ERR_NETWORK_ACCESS_DENIED|ERR_CONNECTION_REFUSED|TCP connection/i.test(message)) return "The scanner browser was blocked from connecting to this website. On localhost, check your firewall, antivirus, VPN, office network, or whether the website blocks your public IP address. The website may still open from another network.";
  if (/timed out|timeout|taking too long|deadline|failure stage: response/i.test(message)) return "This website took too long to respond. Please try again shortly. If it continues, check the hosting server, firewall, or bot-protection settings.";
  if (/temporary HTTP|rate limit|HTTP 429/i.test(message)) return "This website temporarily limited the scan. Please wait a few minutes and try again.";
  if (/javascript application shell|javascript-required placeholder|browser-rendered content/i.test(message)) return "This website loads its content with JavaScript, but the scanner could not open the rendered page. No score was calculated because an empty page would give an inaccurate result. Please retry shortly.";
  if (/private|localhost|public website URL/i.test(message)) return "Please enter a public website address, such as https://yourwebsite.com.";
  if (/invalid|please enter|website URL/i.test(message)) return "Please enter a valid website address, such as https://yourwebsite.com.";
  if (status && status >= 500) return "The website's server is currently unavailable. Please try again later.";
  if (status && status >= 400) return `The website returned an error (HTTP ${status}) and could not be scanned. Check the URL or contact the site owner.`;
  return "We could not complete this scan. Please check the website address and try again. If the problem continues, contact support.";
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
    if (!WEBSITE_PROFILES.has(body?.profile)) {
      return errorResponse("Choose the website type that best matches this business before starting the scan.", 400);
    }

    // Load the scanner inside the handler so live import/runtime failures still return JSON.
    const { scanWebsite } = await import("@/lib/scanner");
    const report = await scanWebsite(body?.url, { profile: body?.profile });
    const scanRecord = await saveScanRecord(request, report, body);
    if (scanRecord) report.scanId = String(scanRecord._id);
    return Response.json({ report, scanId: scanRecord ? String(scanRecord._id) : null });
  } catch (error) {
    const technicalMessage = error?.message || "Unknown scan error";
    const message = userFacingScanError(error);
    if (error?.websiteFailure || error?.code === "WEBSITE_UNAVAILABLE") {
      console.warn("Website unavailable", technicalMessage);
      return Response.json({ error: message, websiteFailure: true, score: 0, httpStatus: error.httpStatus ?? null }, { status: 422 });
    }
    const isUserFixable = /(invalid|please enter|website url|offline|timeout|timed out|taking too long|too long to respond|blocked|ssl|tls|dns|scan incomplete|private|localhost|unable to reach|could not reach)/i.test(technicalMessage);
    if (isUserFixable) {
      console.warn("Scan request rejected", technicalMessage);
    } else {
      console.error("Scan API failed", error);
    }
    return errorResponse(message, isUserFixable ? 400 : 500);
  }
}
