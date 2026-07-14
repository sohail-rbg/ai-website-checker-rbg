import Link from "next/link";
import { connectToDatabase } from "@/lib/db";
import Scan from "@/models/Scan";
import { createPageMetadata } from "../seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = createPageMetadata({
  title: "Protected ScanSiteAI Scans",
  description: "Protected admin view for saved ScanSiteAI website scan records.",
  path: "/scans",
  keywords: ["ScanSiteAI scans", "protected scan history", "AI readiness scan records"],
  index: false,
  follow: false,
});

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return { date: "Not available", time: "Not available" };

  return {
    date: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function scoreTone(score) {
  const value = Number(score) || 0;
  if (value >= 90) return "text-[#90ee9a]";
  if (value >= 75) return "text-[#f5d66e]";
  return "text-[#ff8fa3]";
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
      .select("requestedUrl finalUrl overallScore grade topRecommendations userAgent scannedAt createdAt report.scoreBreakdown report.performance report.schema report.entities report.recommendations")
      .lean();
  } catch (error) {
    dbError = error.message || "Could not load scan records.";
  }

  const averageScore = scans.length
    ? Math.round(scans.reduce((sum, scan) => sum + (Number(scan.overallScore) || 0), 0) / scans.length)
    : 0;
  const needsWork = scans.filter((scan) => Number(scan.overallScore) < 75).length;
  const excellent = scans.filter((scan) => Number(scan.overallScore) >= 90).length;

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

            <div className="overflow-x-auto border-t border-[#8B9C8C]/15">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead className="text-[#8B9C8C]">
                  <tr>
                    <th className="py-4 pr-5 font-semibold">Website</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Time</th>
                    <th className="px-5 py-4 font-semibold">Score</th>
                    <th className="px-5 py-4 font-semibold">Top Recommendation</th>
                    <th className="px-5 py-4 font-semibold">Detected Entity</th>
                    <th className="py-4 pl-5 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => {
                    const scanned = formatDateTime(scan.scannedAt || scan.createdAt);
                    const topRecommendation = scan.topRecommendations?.[0] || scan.report?.recommendations?.[0]?.title || "No priority fix";
                    const company = scan.report?.entities?.companyName || "Not detected";
                    const performance = scan.report?.performance?.performance ?? scan.report?.scoreBreakdown?.performance;

                    return (
                      <tr key={String(scan._id)} className="border-t border-[#8B9C8C]/12 align-top text-[#d9e1d8]">
                        <td className="max-w-[320px] py-5 pr-5">
                          <a href={scan.finalUrl || scan.requestedUrl} target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-[#8B9C8C]/35 underline-offset-4 transition hover:text-[#9fe0a8]">
                            <span className="line-clamp-2 break-all">{scan.finalUrl || scan.requestedUrl}</span>
                          </a>
                          {scan.requestedUrl !== scan.finalUrl && (
                            <p className="mt-2 line-clamp-1 break-all text-xs text-[#d9e1d8]/45">Requested: {scan.requestedUrl}</p>
                          )}
                        </td>
                        <td className="px-5 py-5">{scanned.date}</td>
                        <td className="px-5 py-5">{scanned.time}</td>
                        <td className="px-5 py-5">
                          <span className={`text-2xl font-semibold ${scoreTone(scan.overallScore)}`}>{scan.overallScore ?? "N/A"}</span>
                          <span className="ml-2 text-xs text-[#8B9C8C]">Grade {scan.grade || "N/A"}</span>
                        </td>
                        <td className="max-w-[260px] px-5 py-5">
                          <span className="line-clamp-2">{topRecommendation}</span>
                        </td>
                        <td className="max-w-[220px] px-5 py-5">
                          <span className="line-clamp-2">{company}</span>
                        </td>
                        <td className="py-5 pl-5">
                          <details className="max-w-[320px] rounded-2xl border border-[#8B9C8C]/15 bg-white/[0.03] p-3">
                            <summary className="cursor-pointer font-semibold text-[#9fe0a8]">View signals</summary>
                            <div className="mt-3 grid gap-2 text-xs leading-5 text-[#d9e1d8]/72">
                              <p>Schema: {scan.report?.scoreBreakdown?.schema ?? "N/A"}/100</p>
                              <p>Content: {scan.report?.scoreBreakdown?.content ?? "N/A"}/100</p>
                              <p>EEAT: {scan.report?.scoreBreakdown?.eeat ?? "N/A"}/100</p>
                              <p>Entities: {scan.report?.scoreBreakdown?.entities ?? "N/A"}/100</p>
                              <p>Performance: {performance ?? "N/A"}/100</p>
                              <p>Schema types: {(scan.report?.schema?.present || []).join(", ") || "None"}</p>
                            </div>
                          </details>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!scans.length && (
                <div className="py-12 text-center text-[#d9e1d8]/62">No saved scans yet.</div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
