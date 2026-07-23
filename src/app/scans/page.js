import Link from "next/link";
import { connectToDatabase } from "@/lib/db";
import Scan from "@/models/Scan";
import { createPageMetadata, pageTitles } from "../seo";
import ScansDataTable from "./ScansDataTable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = createPageMetadata({
  title: pageTitles.scans,
  description: "Protected admin view for saved ScanSiteAI website scan records.",
  path: "/scans",
  keywords: ["ScanSiteAI scans", "protected scan history", "AI readiness scan records"],
  index: false,
  follow: false,
});

function formatDateTime(value, requestedTimeZone) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return { date: "Not available", time: "Not available" };
  let timeZone = String(requestedTimeZone || "").trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(date);
  } catch {
    timeZone = "UTC";
  }

  return {
    date: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone,
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short",
    }),
    timeZone,
  };
}

function formatLocation(location) {
  return [location?.city, location?.region].filter(Boolean).join(", ") || "Not available";
}

function formatCountry(location) {
  return location?.country || "Not available";
}

function formatBrowser(browser, userAgent) {
  if (browser?.name && browser.name !== "Unknown") {
    return [browser.name, browser.version].filter(Boolean).join(" ");
  }
  if (!userAgent) return "Not available";
  return "Unknown browser";
}

function contactKey(type, value) {
  const clean = String(value || "").toLowerCase();
  return type === "phone" ? clean.replace(/\D/g, "") : clean;
}

function uniqueContacts(type, values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = contactKey(type, value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatContactSource(scan, type, value) {
  const expected = contactKey(type, value);
  const source = (scan.report?.entities?.contactSources || []).find((item) => item.type === type && contactKey(type, item.value) === expected);
  if (!source) return type === "phone" ? "Entity phone" : "Entity email";

  const location = source.sourceName === "homepage" ? "homepage" : "contact page";
  return `${source.source} · ${location}`;
}

export default async function ScansPage({ searchParams }) {
  const params = await searchParams;
  const token = params?.token;

  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return (
      <main className="min-h-screen bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-semibold">Protected Scans</h1>
          <p className="mt-3 text-slate-300">Add a valid admin token in the URL to view saved scan records.</p>
        </div>
      </main>
    );
  }

  let scans = [];
  let dbError = "";

  try {
    await connectToDatabase();
    scans = await Scan.find({})
      .sort({ scannedAt: -1 })
      .limit(100)
      .select("requestedUrl finalUrl email entityEmail entityPhone lead submission overallScore grade topRecommendations userAgent browser location scannedAt createdAt report.scoreBreakdown report.performance report.schema report.entities report.recommendations")
      .populate("submission", "reportUrl")
      .populate("lead", "reportUrl")
      .lean();
  } catch (error) {
    dbError = error.message || "Could not load scan records.";
  }

  const averageScore = scans.length
    ? Math.round(scans.reduce((sum, scan) => sum + (Number(scan.overallScore) || 0), 0) / scans.length)
    : 0;
  const needsWork = scans.filter((scan) => Number(scan.overallScore) < 75).length;
  const excellent = scans.filter((scan) => Number(scan.overallScore) >= 90).length;
  const scanRows = scans.map((scan) => {
    const scanned = formatDateTime(scan.scannedAt || scan.createdAt, scan.location?.timezone);
    const topRecommendation = scan.topRecommendations?.[0] || scan.report?.recommendations?.[0]?.title || "No priority fix";
    const company = scan.report?.entities?.companyName || "Not detected";
    const performance = scan.report?.performance?.performance ?? scan.report?.scoreBreakdown?.performance ?? "N/A";
    const location = formatLocation(scan.location);
    const country = formatCountry(scan.location);
    const browser = formatBrowser(scan.browser, scan.userAgent);
    const submittedEmail = scan.email || "";
    const detectedEmails = uniqueContacts("email", [scan.entityEmail, ...(scan.report?.entities?.emails || [])].filter(Boolean));
    const detectedPhones = uniqueContacts("phone", [scan.entityPhone, ...(scan.report?.entities?.phones || [])].filter(Boolean));
    const reportUrl = scan.submission?.reportUrl || scan.lead?.reportUrl || "";
    const website = scan.finalUrl || scan.requestedUrl;
    const score = Number.isFinite(Number(scan.overallScore)) ? Number(scan.overallScore) : null;
    const dateValue = new Date(scan.scannedAt || scan.createdAt || 0).getTime();
    const signals = {
      schema: scan.report?.scoreBreakdown?.schema ?? "N/A",
      content: scan.report?.scoreBreakdown?.content ?? "N/A",
      eeat: scan.report?.scoreBreakdown?.eeat ?? "N/A",
      entities: scan.report?.scoreBreakdown?.entities ?? "N/A",
      performance,
      schemaTypes: (scan.report?.schema?.present || []).join(", "),
      contactPages: (scan.report?.entities?.scannedContactPages || []).join(", "),
    };
    const searchText = [
      website,
      scan.requestedUrl,
      submittedEmail,
      ...detectedEmails,
      ...detectedPhones,
      location,
      country,
      browser,
      scanned.date,
      scanned.time,
      score,
      scan.grade,
      topRecommendation,
      company,
      signals.schemaTypes,
      signals.contactPages,
    ].filter(Boolean).join(" ").toLowerCase();

    return {
      id: String(scan._id),
      website,
      websiteHref: website,
      redirected: Boolean(scan.requestedUrl && scan.requestedUrl !== website),
      submittedEmail,
      emails: detectedEmails.map((value) => ({ value, source: formatContactSource(scan, "email", value) })),
      phones: detectedPhones.map((value) => ({ value, source: formatContactSource(scan, "phone", value) })),
      reportUrl,
      location,
      country,
      browser,
      date: scanned.date,
      dateValue,
      time: scanned.time,
      timeZone: scanned.timeZone,
      score,
      grade: scan.grade || "N/A",
      topRecommendation,
      company,
      signals,
      searchText,
    };
  });

  return (
    <main className="min-h-screen bg-[#020302] px-5 py-10 text-white sm:px-8">
      <section className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-5 border-b border-[#8B9C8C]/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#8B9C8C]">Private Scan History</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Saved Website Scans</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d9e1d8]/72">
              Review the latest successful scans, scores, recommendations and technical details.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/leads?token=${encodeURIComponent(token)}`} className="inline-flex w-fit rounded-full border border-[#9fe0a8]/35 px-5 py-3 text-sm font-bold text-[#9fe0a8] transition hover:bg-[#9fe0a8] hover:text-[#020302]">
              View Leads
            </Link>
            <Link href="/" className="inline-flex w-fit rounded-full bg-[#9fe0a8] px-5 py-3 text-sm font-bold text-[#020302]">
              Run New Scan
            </Link>
          </div>
        </div>

        {dbError ? (
          <div className="mt-8 rounded-3xl border border-[#ff8fa3]/25 bg-[#ff8fa3]/8 p-6 text-[#ffd6de]">
            {dbError}
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-8 sm:grid-cols-4">
              {[
                ["Saved scans", scans.length],
                ["Average score", averageScore || "N/A"],
                ["Excellent", excellent],
                ["Needs work", needsWork],
              ].map(([label, value]) => (
                <div key={label} className="border-l border-[#8B9C8C]/20 py-1 pl-5">
                  <p className="text-3xl font-semibold text-[#9fe0a8]">{value}</p>
                  <p className="mt-1 text-sm text-[#d9e1d8]/62">{label}</p>
                </div>
              ))}
            </div>

            <ScansDataTable rows={scanRows} />
          </>
        )}
      </section>
    </main>
  );
}
