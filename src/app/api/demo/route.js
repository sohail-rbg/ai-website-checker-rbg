import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/db";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import DemoRequest from "@/models/DemoRequest";

export const runtime = "nodejs";

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function clean(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function notifyAdmin(payload) {
  const transporter = createTransporter();
  if (!transporter) return { sent: false, error: "SMTP is not configured." };

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL?.trim() || "info@scansiteai.com";
  const html = `
    <div style="margin:0;padding:24px;background:#020302;font-family:Arial,Helvetica,sans-serif;color:#111827">
      <div style="max-width:680px;margin:0 auto;border-radius:24px;overflow:hidden;background:#f6f7f4">
        <div style="background:#07100d;padding:30px;color:#ffffff">
          <p style="margin:0 0 10px;color:#8B9C8C;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase">Book a Demo</p>
          <h1 style="margin:0;font-size:30px;line-height:1.15">New ScanSiteAI demo request</h1>
        </div>
        <div style="padding:24px 30px">
          <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapeHtml(payload.email)}">${escapeHtml(payload.email)}</a></p>
          <p><strong>Phone:</strong> ${escapeHtml(payload.phone)}</p>
          <p><strong>Website:</strong> ${escapeHtml(payload.website || "Not provided")}</p>
          <div style="margin-top:18px;border-radius:16px;background:#ffffff;border:1px solid #dfe5dd;padding:16px">
            <strong>Message</strong>
            <p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(payload.message)}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM?.trim(),
      to: adminEmail,
      subject: `New demo request: ${payload.name}`,
      text: [
        "New ScanSiteAI demo request",
        `Name: ${payload.name}`,
        `Email: ${payload.email}`,
        `Phone: ${payload.phone}`,
        `Website: ${payload.website || "Not provided"}`,
        "",
        payload.message,
      ].join("\n"),
      html,
    });
    return { sent: true, error: "" };
  } catch (error) {
    console.error("Demo request admin email failed", error);
    return { sent: false, error: error?.message || "Admin email failed." };
  }
}

export async function POST(request) {
  const rate = checkRateLimit(clientKey(request, "demo"), { limit: 8, windowMs: 60 * 60 * 1000 });
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many demo requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid demo request." }, { status: 400 });
  }

  const payload = {
    name: clean(body.name, 120),
    email: clean(body.email, 180).toLowerCase(),
    phone: clean(body.phone, 80),
    website: clean(body.website, 300),
    message: clean(body.message, 2000),
  };

  if (!payload.name || !payload.phone || !payload.message || !validEmail(payload.email)) {
    return Response.json({ error: "Please complete name, email, phone and message." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const requestDoc = await DemoRequest.create(payload);
    const notification = await notifyAdmin(payload);

    return Response.json({
      ok: true,
      id: String(requestDoc._id),
      notification,
      message: "Demo request saved. We will contact you soon.",
    });
  } catch (error) {
    console.error("Demo request save failed", error);
    return Response.json({ error: "Could not save this demo request right now." }, { status: 500 });
  }
}
