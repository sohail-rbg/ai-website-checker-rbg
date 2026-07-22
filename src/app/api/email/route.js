import nodemailer from "nodemailer";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import Lead from "@/models/Lead";
import Scan from "@/models/Scan";
import Submission from "@/models/Submission";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function createTransporter() {
  const SMTP_HOST = process.env.SMTP_HOST?.trim();
  const SMTP_PORT = process.env.SMTP_PORT?.trim();
  const SMTP_USER = process.env.SMTP_USER?.trim();
  const SMTP_PASS = process.env.SMTP_PASS?.trim();
  const SMTP_FROM = process.env.SMTP_FROM?.trim();
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

function timeoutAfter(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

async function trySendMail(transporter, mailOptions, label) {
  try {
    await Promise.race([
      transporter.sendMail(mailOptions),
      timeoutAfter(12000, `${label} email timed out. Check SMTP settings.`),
    ]);
    return { ok: true };
  } catch (error) {
    console.error(`Email delivery failed for ${label}`, error);
    return { ok: false, error: error?.message || `Could not send ${label} email.` };
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatScoreLabel(key) {
  if (key === "eeat") return "EEAT";
  return String(key || "").replace(/^\w/, (char) => char.toUpperCase());
}

function sanitizeReportForStorage(report) {
  if (!report || typeof report !== "object") return {};
  return JSON.parse(JSON.stringify(report));
}

function databaseErrorPayload(error, code) {
  const message = error?.message || "";
  const lower = message.toLowerCase();

  let errorText = "Could not save this lead right now.";
  if (/mongodb_uri/i.test(message)) {
    errorText = "MongoDB is not configured. Add MONGODB_URI to your live environment.";
  } else if (lower.includes("bad auth") || lower.includes("authentication failed") || lower.includes("auth failed")) {
    errorText = "MongoDB authentication failed. Check the live MONGODB_URI username and password.";
  } else if (lower.includes("querysrv") || lower.includes("enotfound") || lower.includes("getaddrinfo")) {
    errorText = "MongoDB hostname could not be resolved. Check the live MONGODB_URI value.";
  } else if (lower.includes("server selection timed out") || lower.includes("timed out")) {
    errorText = "MongoDB connection timed out. Check Atlas Network Access/IP allowlist for Vercel.";
  } else if (error?.name === "ValidationError") {
    errorText = "Lead data validation failed before saving.";
  } else if (lower.includes("bson") || lower.includes("maximum size") || lower.includes("object to insert too large")) {
    errorText = "The report is too large for the current database write. Please retry after the latest storage update is deployed.";
  } else if (error?.code === 11000) {
    errorText = "This lead already exists, but the report could not be updated.";
  }

  return {
    error: errorText,
    code,
    detail: process.env.NODE_ENV === "production" ? undefined : message,
  };
}

function buildReportEmail({ website, overallScore, grade, topImprovements, report, wantsCall, reportUrl }) {
  const brandOrigin = reportUrl ? new URL(reportUrl).origin : "https://scansiteai.com";
  const logoUrl = `${brandOrigin}/logo.png`;
  const consultationUrl = "https://calendly.com/scansiteai-info/15min";
  const platforms = Array.isArray(report?.platformScores) ? report.platformScores : [];
  const scoreBreakdown = report?.scoreBreakdown || {};
  const entities = report?.entities || {};
  const recommendations = Array.isArray(report?.recommendations) ? report.recommendations : [];
  const diagnosticSummary = report?.siteAudit?.diagnostics?.summary || {};
  const coverage = report?.siteAudit?.coverage || {};

  const text = [
    "Your AI Website Readiness Report",
    "",
    `Website: ${website}`,
    `Overall Score: ${overallScore}/100`,
    `Grade: ${grade || "N/A"}`,
    wantsCall ? "Call request: Yes" : "Call request: No",
    "",
    "Top Improvements:",
    ...topImprovements.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Estimated Platform Technical Readiness:",
    ...platforms.map((item) => `${item.platform}: ${item.tier || item.status || "Not measured"} (${item.confidence || "low"} confidence)`),
    "Proprietary readiness assessment; not an official platform rating or citation probability.",
    "",
    "Score Breakdown:",
    ...Object.entries(scoreBreakdown).map(([key, value]) => `${formatScoreLabel(key)}: ${value}/100`),
    "",
    "Detected Entities:",
    `Company: ${entities.companyName || "Not detected"}`,
    `Email: ${(entities.emails || [])[0] || "Not detected"}`,
    `Phone: ${(entities.phones || [])[0] || "Not detected"}`,
    "",
    "Scan Coverage:",
    `Pages scanned: ${coverage.scanned ?? "Not available"}`,
    `Checks passed: ${diagnosticSummary.pass ?? 0}`,
    `Warnings: ${diagnosticSummary.warning ?? 0}`,
    `Failed checks: ${diagnosticSummary.fail ?? 0}`,
    `Not measured: ${diagnosticSummary.notMeasured ?? 0}`,
    "",
    `All Improvements (${recommendations.length}):`,
    ...recommendations.map((item, index) => `${index + 1}. ${item.title} - ${item.howToFix || item.description}`),
    "",
    "Talk with a ScanSiteAI expert about these fixes.",
    `Schedule a focused 15-minute review: ${consultationUrl}`,
    "",
    "Thank you for using ScanSiteAI.",
  ].join("\n");

  const html = `
    <div style="margin:0;padding:0;background:#020302;color:#111827;font-family:Arial,Helvetica,sans-serif">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020302;padding:28px 12px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;border-collapse:collapse">
              <tr>
                <td style="border-radius:28px 28px 0 0;background:#020302;background-image:linear-gradient(135deg,#020302,#11231f 56%,#262a53);padding:34px 30px;color:#ffffff">
                  <img src="${escapeHtml(logoUrl)}" width="190" alt="ScanSiteAI" style="display:block;width:190px;max-width:70%;height:auto;margin:0 0 26px;border:0" />
                  <p style="margin:0 0 12px;color:#90ee9a;font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase">Complete Website Audit</p>
                  <h1 style="margin:0;font-size:34px;line-height:1.08;letter-spacing:-.02em;color:#ffffff">Your Complete AI Readiness Report</h1>
                  <p style="margin:14px 0 0;color:#d9e1d8;font-size:15px;line-height:1.7;word-break:break-word">${escapeHtml(website)}</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px">
                    <tr>
                      <td style="padding:0 24px 0 0;border-right:1px solid rgba(255,255,255,.18)">
                        <div style="font-size:58px;font-weight:800;line-height:1;color:#90ee9a">${overallScore}</div>
                        <div style="margin-top:6px;color:#d9e1d8;font-size:12px;text-transform:uppercase;letter-spacing:.16em">Overall Score</div>
                      </td>
                      <td style="padding-left:24px">
                        <div style="font-size:32px;font-weight:800;color:#ffffff">${escapeHtml(grade || "N/A")}</div>
                        <div style="margin-top:6px;color:#d9e1d8;font-size:12px;text-transform:uppercase;letter-spacing:.16em">Readiness Grade</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background:#f6f7f4;padding:26px 30px">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="border-radius:20px;background:#ffffff;border:1px solid #dfe5dd;padding:22px">
                        <h2 style="margin:0 0 14px;color:#111827;font-size:20px">Priority Improvements</h2>
                        ${topImprovements.map((item, index) => `
                          <div style="padding:${index === 0 ? "0 0 14px" : "14px 0"};border-bottom:${index === topImprovements.length - 1 ? "0" : "1px solid #e5e7eb"}">
                            <span style="display:inline-block;width:26px;height:26px;border-radius:999px;background:#2E5E53;color:#ffffff;text-align:center;line-height:26px;font-size:13px;font-weight:800">${index + 1}</span>
                            <strong style="margin-left:10px;color:#111827">${escapeHtml(item)}</strong>
                          </div>
                        `).join("")}
                      </td>
                    </tr>
                  </table>

                  <h2 style="margin:28px 0 14px;color:#111827;font-size:20px">Scan Coverage</h2>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-spacing:8px 0;margin-left:-8px;width:calc(100% + 16px)">
                    <tr>
                      ${[
                        ["Pages", coverage.scanned ?? "N/A", "#2E5E53"],
                        ["Passed", diagnosticSummary.pass ?? 0, "#168a46"],
                        ["Warnings", diagnosticSummary.warning ?? 0, "#9a6a00"],
                        ["Failed", diagnosticSummary.fail ?? 0, "#c4324f"],
                      ].map(([label, value, color]) => `<td width="25%" style="border-radius:14px;background:#ffffff;border:1px solid #dfe5dd;padding:13px 8px;text-align:center"><strong style="display:block;color:${color};font-size:22px">${escapeHtml(value)}</strong><span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.08em">${label}</span></td>`).join("")}
                    </tr>
                  </table>

                  <h2 style="margin:28px 0 14px;color:#111827;font-size:20px">Estimated Platform Technical Readiness</h2>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-spacing:0 10px">
                    ${platforms.map((item) => `
                      <tr>
                        <td style="border-radius:16px 0 0 16px;background:#ffffff;border-left:1px solid #e5e7eb;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:14px 16px;color:#111827;font-weight:800">${escapeHtml(item.platform)}</td>
                        <td style="background:#ffffff;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:14px 16px;color:#2E5E53;font-size:18px;font-weight:900;text-align:center">${escapeHtml(item.tier || item.status || "Not measured")}</td>
                        <td style="border-radius:0 16px 16px 0;background:#ffffff;border-right:1px solid #e5e7eb;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:14px 16px;color:#6b7280;text-align:right">${escapeHtml(item.confidence || "low")} confidence</td>
                      </tr>
                    `).join("")}
                  </table>
                  <p style="margin:10px 0 0;color:#6b7280;font-size:12px;line-height:1.5">Proprietary technical-readiness assessment. Not an official platform rating, ranking, citation probability, or visibility measurement.</p>

                  <h2 style="margin:28px 0 14px;color:#111827;font-size:20px">Score Breakdown</h2>
                  ${Object.entries(scoreBreakdown).map(([key, value]) => `
                    <div style="margin:0 0 12px">
                      <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#374151;font-size:13px">
                        <strong>${escapeHtml(formatScoreLabel(key))}</strong>
                        <span>${value}/100</span>
                      </div>
                      <div style="height:9px;border-radius:999px;background:#dfe5dd;overflow:hidden">
                        <div style="height:9px;width:${value}%;border-radius:999px;background:#2E5E53"></div>
                      </div>
                    </div>
                  `).join("")}

                  <h2 style="margin:30px 0 6px;color:#111827;font-size:20px">All Improvements</h2>
                  <p style="margin:0 0 14px;color:#6b7280;font-size:13px">${recommendations.length} implementation-ready recommendations from this scan.</p>
                  ${recommendations.map((item) => `
                    <div style="border:1px solid #e5e7eb;border-radius:20px;background:#ffffff;padding:18px;margin:0 0 14px">
                      <h3 style="margin:0 0 8px;color:#111827;font-size:18px">${escapeHtml(item.title)}</h3>
                      <p style="margin:0 0 12px;color:#4b5563;line-height:1.6">${escapeHtml(item.description)}</p>
                      <div style="border-radius:14px;background:#f6f7f4;padding:12px;margin-bottom:10px"><strong>Status:</strong> ${escapeHtml(item.currentStatus)}</div>
                      <p style="margin:0 0 8px;color:#374151"><strong>Why AI cares:</strong> ${escapeHtml(item.whyAiCares)}</p>
                      <p style="margin:0 0 10px;color:#374151"><strong>How to fix:</strong> ${escapeHtml(item.howToFix)}</p>
                      <p style="margin:0;color:#2E5E53;font-weight:800">${escapeHtml(item.difficulty)} · +${item.expectedGain} points</p>
                    </div>
                  `).join("")}

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px">
                    <tr>
                      <td style="border-radius:20px;background:#ffffff;border:1px solid #e5e7eb;padding:18px">
                        <h2 style="margin:0 0 12px;color:#111827;font-size:20px">Detected Entity Signals</h2>
                        <p style="margin:0 0 6px;color:#374151"><strong>Company:</strong> ${escapeHtml(entities.companyName || "Not detected")}</p>
                        <p style="margin:0 0 6px;color:#374151"><strong>Email:</strong> ${escapeHtml((entities.emails || [])[0] || "Not detected")}</p>
                        <p style="margin:0;color:#374151"><strong>Phone:</strong> ${escapeHtml((entities.phones || [])[0] || "Not detected")}</p>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px">
                    <tr>
                      <td style="border-radius:22px;background:#071c15;background-image:linear-gradient(135deg,#071c15,#16382d);border:1px solid #2E5E53;padding:24px;color:#ffffff">
                        <p style="margin:0 0 8px;color:#90ee9a;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">Expert guidance</p>
                        <h2 style="margin:0;color:#ffffff;font-size:23px;line-height:1.3">Talk with a ScanSiteAI expert about these fixes.</h2>
                        <p style="margin:10px 0 0;color:#d9e1d8;font-size:14px;line-height:1.7">Review your priority recommendations and turn this audit into a focused implementation plan in a 15-minute call.</p>
                        <a href="${consultationUrl}" style="display:inline-block;margin-top:18px;border-radius:999px;background:#9fe0a8;color:#020302;font-weight:800;text-decoration:none;padding:13px 20px">Schedule a 15-minute call →</a>
                      </td>
                    </tr>
                  </table>
                  ${wantsCall ? `<p style="margin:22px 0 0;border-radius:16px;background:#2E5E53;color:#ffffff;padding:14px 16px;font-weight:800">Call request received. We will follow up to review these fixes.</p>` : ""}
                </td>
              </tr>
              <tr>
                <td style="border-radius:0 0 28px 28px;background:#111827;padding:18px 30px;color:#9ca3af;font-size:12px;text-align:center">
                  Thank you for using ScanSiteAI.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { text, html };
}

function buildAdminLeadEmail({ email, website, overallScore, grade, wantsCall, reportUrl, leadId, topImprovements }) {
  const brandOrigin = reportUrl ? new URL(reportUrl).origin : "https://scansiteai.com";
  const logoUrl = `${brandOrigin}/logo.png`;
  const text = [
    "New ScanSiteAI Lead",
    "",
    `Email: ${email}`,
    `Website: ${website}`,
    `Overall Score: ${overallScore}/100`,
    `Grade: ${grade || "N/A"}`,
    `Call requested: ${wantsCall ? "Yes" : "No"}`,
    `Lead ID: ${leadId}`,
    reportUrl ? `Hosted report: ${reportUrl}` : "",
    "",
    "Top improvements:",
    ...topImprovements.slice(0, 5).map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");

  const html = `
    <div style="margin:0;padding:0;background:#020302;font-family:Arial,Helvetica,sans-serif;color:#111827">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020302;padding:24px 12px">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:collapse">
              <tr>
                <td style="border-radius:24px 24px 0 0;background:#020302;background-image:linear-gradient(135deg,#020302,#11231f 62%,#2E5E53);padding:30px;color:#ffffff">
                  <img src="${escapeHtml(logoUrl)}" width="170" alt="ScanSiteAI" style="display:block;width:170px;max-width:70%;height:auto;margin:0 0 22px;border:0" />
                  <p style="margin:0 0 10px;color:#90ee9a;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase">${wantsCall ? "Priority follow-up · Call requested" : "New report lead"}</p>
                  <h1 style="margin:0;font-size:30px;line-height:1.12;color:#ffffff">ScanSiteAI Submission</h1>
                  <p style="margin:12px 0 0;color:#d9e1d8;font-size:15px;word-break:break-word">${escapeHtml(website)}</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f6f7f4;padding:24px 30px">
                  ${wantsCall ? `<div style="margin:0 0 18px;border-radius:16px;background:#dff7e3;border:1px solid #9fe0a8;padding:14px 16px;color:#16382d;font-weight:800">✓ This user requested a call. Follow up soon.</div>` : ""}
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="border-radius:18px;background:#ffffff;border:1px solid #dfe5dd;padding:18px">
                        <p style="margin:0 0 8px;color:#374151"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}" style="color:#2E5E53">${escapeHtml(email)}</a></p>
                        <p style="margin:0 0 8px;color:#374151"><strong>Website:</strong> ${escapeHtml(website)}</p>
                        <p style="margin:0 0 8px;color:#374151"><strong>Score:</strong> ${overallScore}/100</p>
                        <p style="margin:0 0 8px;color:#374151"><strong>Grade:</strong> ${escapeHtml(grade || "N/A")}</p>
                        <p style="margin:0;color:#374151"><strong>Call requested:</strong> ${wantsCall ? "Yes" : "No"}</p>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:18px"><tr>
                    <td style="padding:0 8px 8px 0"><a href="mailto:${escapeHtml(email)}" style="display:inline-block;border-radius:999px;background:#16382d;color:#ffffff;font-weight:800;text-decoration:none;padding:12px 18px">Email Lead</a></td>
                    <td style="padding:0 8px 8px 0"><a href="${escapeHtml(website)}" style="display:inline-block;border-radius:999px;border:1px solid #2E5E53;color:#16382d;font-weight:800;text-decoration:none;padding:11px 18px">Visit Website</a></td>
                    ${reportUrl ? `<td style="padding:0 0 8px"><a href="${escapeHtml(reportUrl)}" style="display:inline-block;border-radius:999px;background:#9fe0a8;color:#020302;font-weight:800;text-decoration:none;padding:12px 18px">Open Report</a></td>` : ""}
                  </tr></table>
                  <h2 style="margin:26px 0 12px;color:#111827;font-size:18px">Top Improvements</h2>
                  ${topImprovements.slice(0, 5).map((item, index) => `
                    <div style="border-radius:14px;background:#ffffff;border:1px solid #e5e7eb;padding:12px 14px;margin-bottom:10px;color:#374151">
                      <strong style="color:#2E5E53">${index + 1}.</strong> ${escapeHtml(item)}
                    </div>
                  `).join("")}
                </td>
              </tr>
              <tr>
                <td style="border-radius:0 0 24px 24px;background:#111827;padding:16px 30px;color:#9ca3af;font-size:12px;text-align:center">
                  Lead ID: ${escapeHtml(leadId)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { text, html };
}

export async function POST(request) {
  try {
    const rate = checkRateLimit(clientKey(request, "email"), { limit: 12, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) {
      return Response.json(
        { error: "Too many report requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } }
      );
    }
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Email API request parsing failed", error);
      return Response.json(
        { error: "The report request is too large. Please run the scan again and submit the report." },
        { status: 413 }
      );
    }
    const email = String(body.email || "").trim().toLowerCase();
    const website = String(body.website || "").trim();
    const overallScore = Number(body.overallScore);
    const fullReport = sanitizeReportForStorage(body.report);
    const topImprovements = Array.isArray(body.topImprovements)
      ? body.topImprovements.slice(0, 10)
      : Array.isArray(fullReport.recommendations)
        ? fullReport.recommendations.slice(0, 10).map((item) => item.title)
        : [];
    const submittedAt = new Date();
    const summary = {
      grade: body.grade,
      topImprovements,
      platformScores: body.platformScores || {},
    };

    if (!validateEmail(email)) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!website || Number.isNaN(overallScore)) {
      return Response.json({ error: "Report details are missing." }, { status: 400 });
    }

    try {
      await connectToDatabase();
    } catch (error) {
      console.error("MongoDB connection failed during lead capture", error);
      return Response.json(databaseErrorPayload(error, "DATABASE_CONNECTION_FAILED"), { status: 500 });
    }

    let lead;
    try {
      lead = await Lead.findOneAndUpdate(
        { email, website },
        {
          $set: {
            overallScore,
            wantsCall: Boolean(body.wantsCall),
            lastSubmittedAt: submittedAt,
            summary,
            report: fullReport,
          },
          $inc: { submissionCount: 1 },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    } catch (error) {
      console.error("Lead save failed", error);
      return Response.json(databaseErrorPayload(error, "LEAD_SAVE_FAILED"), { status: 500 });
    }

    try {
      await Lead.collection.updateOne({ _id: lead._id }, { $unset: { submissions: "" } });
    } catch (error) {
      console.error("Legacy embedded submissions cleanup failed", error);
    }

    let submission;
    try {
      submission = await Submission.create({
        lead: lead._id,
        submittedAt,
        email,
        website,
        overallScore,
        grade: body.grade,
        wantsCall: Boolean(body.wantsCall),
        topImprovements,
        platformScores: body.platformScores || {},
        report: fullReport,
      });
    } catch (error) {
      console.error("Report submission save failed", error);
      return Response.json(databaseErrorPayload(error, "SUBMISSION_SAVE_FAILED"), { status: 500 });
    }

    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const reportUrl = `${origin}/report/${lead._id}?submission=${submission._id}`;

    let transporter = null;
    try {
      transporter = createTransporter();
    } catch (error) {
      console.error("SMTP transporter setup failed", error);
    }

    const delivery = {
      userSent: false,
      adminSent: false,
      error: "",
      lastAttemptAt: new Date(),
    };

    if (transporter) {
      const emailReport = buildReportEmail({
        website,
        overallScore,
        grade: body.grade,
        topImprovements,
        report: fullReport,
        wantsCall: Boolean(body.wantsCall),
        reportUrl,
      });
      const userDelivery = await trySendMail(transporter, {
        from: process.env.SMTP_FROM?.trim(),
        to: email,
        subject: "Your AI Website Readiness Report",
        text: emailReport.text,
        html: emailReport.html,
      }, "user report");
      delivery.userSent = userDelivery.ok;

      const adminEmail = process.env.ADMIN_NOTIFY_EMAIL?.trim() || "info@scansiteai.com";
      const adminReport = buildAdminLeadEmail({
        email,
        website,
        overallScore,
        grade: body.grade,
        wantsCall: Boolean(body.wantsCall),
        reportUrl,
        leadId: String(lead._id),
        topImprovements,
      });
      const adminDelivery = await trySendMail(transporter, {
        from: process.env.SMTP_FROM?.trim(),
        to: adminEmail,
        subject: `New ScanSiteAI Lead: ${website}`,
        text: adminReport.text,
        html: adminReport.html,
      }, "admin notification");
      delivery.adminSent = adminDelivery.ok;
      delivery.error = [userDelivery.error, adminDelivery.error].filter(Boolean).join(" | ");
    } else {
      delivery.error = "SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM.";
    }

    const emailSent = delivery.userSent && delivery.adminSent;
    try {
      await Lead.updateOne(
        { _id: lead._id },
        {
          $set: {
            reportUrl,
            emailSent,
            emailDelivery: delivery,
            latestSubmission: submission._id,
          },
        }
      );
      await Submission.updateOne(
        { _id: submission._id },
        {
          $set: {
            reportUrl,
            emailSent,
            emailDelivery: delivery,
          },
        }
      );
      if (fullReport.scanId && mongoose.Types.ObjectId.isValid(fullReport.scanId)) {
        await Scan.updateOne(
          { _id: fullReport.scanId },
          {
            $set: {
              email,
              lead: lead._id,
              submission: submission._id,
            },
          }
        );
      }
    } catch (error) {
      console.error("Lead email delivery status update failed", error);
      delivery.error = [delivery.error, "Lead saved, but delivery status could not be updated."].filter(Boolean).join(" | ");
    }

    return Response.json({
      ok: true,
      leadId: String(lead._id),
      submissionId: String(submission._id),
      reportUrl,
      emailSent,
      delivery,
      message: emailSent
        ? "Report confirmation sent."
        : "Lead saved. Email delivery needs SMTP configuration.",
    });
  } catch (error) {
    console.error("Lead capture failed", error);
    const missingMongo = /MONGODB_URI/.test(error.message || "");
    return Response.json(
      { error: missingMongo ? "MongoDB is not configured. Add MONGODB_URI to your environment." : "Could not save this lead right now." },
      { status: 500 }
    );
  }
}
