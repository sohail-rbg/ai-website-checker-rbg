import { readFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import Lead from "@/models/Lead";
import Submission from "@/models/Submission";
import { launchBrowser } from "@/lib/browser";

export const runtime = "nodejs";
export const maxDuration = 60;

const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const label = (value) => String(value || "unknown").replaceAll("_", " ");
const boundedScore = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Math.round(Number(value)))) : null;

function createReportHtml({ report, website, overallScore, logo }) {
  const platforms = Array.isArray(report.platformScores) ? report.platformScores : [];
  const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
  const checks = Array.isArray(report.siteAudit?.diagnostics?.checks) ? report.siteAudit.diagnostics.checks : [];
  const pages = Array.isArray(report.siteAudit?.pages) ? report.siteAudit.pages : [];
  const summary = report.siteAudit?.diagnostics?.summary || {};
  const states = { pass: ["✓", "#168a46", "#e8f8ee"], fail: ["×", "#c4324f", "#fff0f3"], warning: ["!", "#946300", "#fff7d6"], not_measured: ["–", "#667068", "#f0f3f1"], unknown: ["–", "#667068", "#f0f3f1"] };
  const scanned = report.scannedAt ? new Date(report.scannedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Not available";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:A4;margin:15mm 12mm 18mm}*{box-sizing:border-box}body{margin:0;color:#17201d;font:11px/1.5 Arial,sans-serif}h1,h2,h3,p{margin-top:0}h2{margin:25px 0 11px;padding-bottom:6px;border-bottom:2px solid #dce9df;color:#10241b;font-size:19px}.cover{min-height:247mm;padding:30px;border-radius:24px;background:linear-gradient(145deg,#020302,#10271e 62%,#23344e);color:#fff;page-break-after:always}.logo{width:190px;height:auto}.eyebrow{margin-top:52px;color:#90ee9a;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase}.cover h1{max-width:570px;margin:12px 0 16px;font-size:42px;line-height:1.08}.url{color:#d9e1d8;word-break:break-all}.hero{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:38px}.hero div{padding:20px;border:1px solid rgba(144,238,154,.25);border-radius:18px;background:rgba(255,255,255,.05)}.hero strong{display:block;color:#90ee9a;font-size:42px}.hero span{color:#d9e1d8;text-transform:uppercase;letter-spacing:1px}.coverfoot{margin-top:55px;color:#aebbb1}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.stat{padding:12px;border-radius:12px;background:#f2f7f3;text-align:center}.stat strong{display:block;font-size:20px}.bars{display:grid;gap:8px}.bar{display:grid;grid-template-columns:115px 1fr 38px;align-items:center;gap:8px}.track{height:7px;border-radius:9px;background:#e3e9e4;overflow:hidden}.fill{height:100%;border-radius:9px;background:#2e8c68}.platforms{display:grid;grid-template-columns:1fr 1fr;gap:8px}.platform{padding:12px;border:1px solid #dce5de;border-radius:12px;break-inside:avoid}.platform strong{display:block;font-size:15px}.pill{display:inline-block;margin-top:7px;padding:3px 8px;border-radius:12px;background:#e8f8ee;color:#168a46;font-size:10px;font-weight:700}.recommendation{margin-bottom:10px;padding:14px;border:1px solid #dce5de;border-radius:13px;break-inside:avoid}.recommendation h3{margin-bottom:6px;font-size:15px}.meta{color:#2e6f57;font-size:9px;font-weight:700;text-transform:uppercase}.fix{margin-top:8px;padding:9px;border-radius:8px;background:#f2f7f3}.table{width:100%;border-collapse:collapse;font-size:8px}.table th{background:#10271e;color:#fff;text-align:left}.table th,.table td{padding:5px;border:1px solid #dfe5e0;vertical-align:top}.table tr{break-inside:avoid}.result{display:inline-block;padding:1px 5px;border-radius:9px;font-weight:800}.muted{color:#68736b}.break{page-break-before:always}
  </style></head><body>
  <section class="cover"><img class="logo" src="${logo}" alt="ScanSiteAI"><p class="eyebrow">Client-ready website intelligence</p><h1>AI Website Readiness Report</h1><p class="url">${esc(website)}</p><div class="hero"><div><strong>${esc(overallScore)}</strong><span>Overall readiness score</span></div><div><strong>${esc(report.grade || "N/A")}</strong><span>Readiness grade</span></div></div><p class="coverfoot">Scanned ${esc(scanned)}<br>Prepared by ScanSiteAI · scansiteai.com</p></section>
  <h2>Executive Summary</h2><div class="summary"><div class="stat"><strong style="color:#168a46">${summary.pass || 0}</strong>Passed</div><div class="stat"><strong style="color:#946300">${summary.warning || 0}</strong>Warnings</div><div class="stat"><strong style="color:#c4324f">${summary.fail || 0}</strong>Failed</div><div class="stat"><strong>${summary.notMeasured || 0}</strong>Not measured</div></div>
  <h2>Score Breakdown</h2><div class="bars">${Object.entries(report.scoreBreakdown || {}).map(([key,value])=>`<div class="bar"><span>${esc(key === "eeat" ? "EEAT" : key.replace(/^./,c=>c.toUpperCase()))}</span><div class="track"><div class="fill" style="width:${boundedScore(value)||0}%"></div></div><strong>${boundedScore(value)??"N/A"}</strong></div>`).join("")}</div>
  <h2>Estimated Platform Readiness</h2><div class="platforms">${platforms.map(item=>`<div class="platform"><strong>${esc(item.platform)}</strong><span class="muted">${esc(item.crawler || "Platform crawler")}</span><br><span class="pill">${esc(item.tier || item.status || "Not measured")}</span> <span class="muted">${esc(item.confidence || "low")} confidence</span></div>`).join("")}</div>
  <h2 class="break">Prioritized Recommendations</h2>${recommendations.map((item,index)=>`<article class="recommendation"><p class="meta">Priority ${index+1} · ${esc(item.status || item.currentStatus || "review")} · Potential +${Number(item.scoreEffect ?? item.expectedGain)||0}</p><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><p><strong>Why it matters:</strong> ${esc(item.businessImpact || item.whyAiCares)}</p><div class="fix"><strong>Recommended fix:</strong> ${esc(item.howToFix)}</div>${item.affectedUrl?`<p class="muted">Affected URL: ${esc(item.affectedUrl)}</p>`:""}</article>`).join("")}
  <h2 class="break">Complete Technical Checklist</h2><table class="table"><thead><tr><th>Check</th><th>Category</th><th>Result</th><th>Evidence</th><th>Page</th></tr></thead><tbody>${checks.map(item=>{const state=states[item.status]||states.unknown;return `<tr><td><strong>${esc(item.label)}</strong></td><td>${esc(label(item.category))}</td><td><span class="result" style="color:${state[1]};background:${state[2]}">${state[0]} ${esc(label(item.status))}</span></td><td>${esc(item.evidence)}</td><td>${esc(item.url||"Site-wide")}</td></tr>`}).join("")}</tbody></table>
  <h2 class="break">Scanned Page Coverage</h2><table class="table"><thead><tr><th>Page</th><th>Type</th><th>HTTP</th><th>Words</th><th>JS dependent</th><th>Schema</th><th>Issues</th></tr></thead><tbody>${pages.map(page=>`<tr><td>${esc(page.url)}</td><td>${esc(page.role)}</td><td>${esc(page.status??"Unknown")}</td><td>${page.raw?.wordCount??0}</td><td>${page.rendered?.jsDependentPercent==null?"Not measured":`${page.rendered.jsDependentPercent}%`}</td><td>${page.schema?.score??"N/A"}</td><td>${(page.findings||[]).filter(item=>item.status!=="pass").length}</td></tr>`).join("")}</tbody></table>
  <h2>SEO Metadata Quality</h2><table class="table"><thead><tr><th>Page</th><th>Title</th><th>Title size</th><th>H1 alignment</th><th>Description size</th><th>Relevance</th><th>Unique</th></tr></thead><tbody>${pages.map(page=>`<tr><td>${esc(page.url)}</td><td>${esc(page.title||"Missing")}</td><td>${page.metadataQuality?.title.length??0} chars / ${page.metadataQuality?.title.estimatedPixels??0}px</td><td>${page.metadataQuality?.title.h1AlignmentPercent==null?"N/A":`${page.metadataQuality.title.h1AlignmentPercent}%`}</td><td>${page.metadataQuality?.description.length??0} chars / ${page.metadataQuality?.description.estimatedPixels??0}px</td><td>${page.metadataQuality?.description.relevancePercent==null?"N/A":`${page.metadataQuality.description.relevancePercent}%`}</td><td>${page.metadataQuality?.uniqueness?.pageSpecific?"Yes":"No"}</td></tr>`).join("")}</tbody></table>
  </body></html>`;
}

export async function GET(request, { params }) {
  let browser;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return Response.json({ error: "Invalid report ID." }, { status: 400 });
    await connectToDatabase();
    const lead = await Lead.findById(id).lean();
    if (!lead) return Response.json({ error: "Report not found." }, { status: 404 });
    const submissionId = new URL(request.url).searchParams.get("submission");
    const submission = submissionId && mongoose.Types.ObjectId.isValid(submissionId) ? await Submission.findOne({ _id: submissionId, lead: id }).lean() : null;
    const report = submission?.report || lead.report || {};
    const website = submission?.website || lead.website || report.finalUrl || "Website";
    const overallScore = submission?.overallScore ?? lead.overallScore ?? report.overallScore ?? "N/A";
    const image = await readFile(path.join(process.cwd(), "public", "logo.png"));
    const html = createReportHtml({ report, website, overallScore, logo: `data:image/png;base64,${image.toString("base64")}` });
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true, displayHeaderFooter: true, margin: { top: "14mm", right: "12mm", bottom: "18mm", left: "12mm" }, headerTemplate: "<span></span>", footerTemplate: '<div style="width:100%;padding:0 12mm;color:#718078;font:9px Arial;display:flex;justify-content:space-between"><span>ScanSiteAI · Client Readiness Report</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
    const host = (() => { try { return new URL(website).hostname.replace(/^www\./, ""); } catch { return "website"; } })();
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="ScanSiteAI-${host}-readiness-report.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("PDF report generation failed", error);
    return Response.json({ error: "Could not generate the PDF report. Please try again." }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
