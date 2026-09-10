import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";

export const runtime = "nodejs";

const TO_EMAIL =
  process.env.ENQUIRY_TO_EMAIL?.trim() || "info@hexacards.com";
const FROM_EMAIL =
  process.env.ENQUIRY_FROM_EMAIL?.trim() ||
  "Hexa Cards <onboarding@resend.dev>";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EnquiryType = "contact" | "franchise";

type EnquiryBody = {
  type?: string;
  name?: string;
  phone?: string;
  email?: string;
  subject?: string;
  message?: string;
  country?: string;
  state?: string;
  city?: string;
  site_url?: string;
  siteUrl?: string;
};

function escapeHtml(raw: string) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEnquiryEmail(opts: {
  type: EnquiryType;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  country?: string;
  state?: string;
  city?: string;
  siteUrl?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Email is not configured. Set RESEND_API_KEY (and optionally ENQUIRY_FROM_EMAIL) in the server environment.",
    };
  }

  const label = opts.type === "franchise" ? "Franchise enquiry" : "Contact enquiry";
  const mailSubject =
    opts.type === "franchise"
      ? `[Franchise] ${opts.name} — Hexa Cards`
      : `[Contact] ${opts.subject || "Website enquiry"} — ${opts.name}`;

  const location =
    opts.type === "franchise"
      ? [opts.city, opts.state, opts.country].filter(Boolean).join(", ")
      : "";

  const textLines = [
    `${label} from hexacards.com`,
    "",
    `Name: ${opts.name}`,
    `Phone: ${opts.phone}`,
    `Email: ${opts.email}`,
    opts.type === "contact" ? `Subject: ${opts.subject}` : null,
    location ? `Location: ${location}` : null,
    opts.siteUrl ? `Page: ${opts.siteUrl}` : null,
    "",
    "Message:",
    opts.message,
  ].filter((line) => line !== null);

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#141414">
      <p style="margin:0 0 12px;font-weight:700">${escapeHtml(label)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        <tr><td style="padding:4px 0;color:#6b6560;width:110px">Name</td><td style="padding:4px 0">${escapeHtml(opts.name)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b6560">Phone</td><td style="padding:4px 0">${escapeHtml(opts.phone)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b6560">Email</td><td style="padding:4px 0">${escapeHtml(opts.email)}</td></tr>
        ${
          opts.type === "contact"
            ? `<tr><td style="padding:4px 0;color:#6b6560">Subject</td><td style="padding:4px 0">${escapeHtml(opts.subject)}</td></tr>`
            : ""
        }
        ${
          location
            ? `<tr><td style="padding:4px 0;color:#6b6560">Location</td><td style="padding:4px 0">${escapeHtml(location)}</td></tr>`
            : ""
        }
      </table>
      <p style="margin:16px 0 6px;font-weight:600">Message</p>
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(opts.message)}</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      reply_to: opts.email,
      subject: mailSubject,
      text: textLines.join("\n"),
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[enquiries] Resend failed:", res.status, detail);
    return {
      ok: false,
      error: "Failed to send email. Please try again shortly.",
    };
  }

  return { ok: true };
}

async function saveEnquiryRow(row: {
  enquiry_type: EnquiryType;
  name: string;
  phone: string;
  email: string;
  subject: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  message: string;
  site_url: string | null;
  email_sent: number;
}) {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("site_enquiries").insert(row);
    if (error) {
      console.warn("[enquiries] DB save skipped:", error.message);
    }
  } catch (err) {
    console.warn(
      "[enquiries] DB save skipped:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * POST /api/enquiries
 * Body: { type: "contact" | "franchise", name, phone, email, message, ... }
 * Emails info@hexacards.com (ENQUIRY_TO_EMAIL) via Resend.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as EnquiryBody;
    const typeRaw = String(body.type || "").trim().toLowerCase();
    const type: EnquiryType | null =
      typeRaw === "contact" || typeRaw === "franchise" ? typeRaw : null;

    if (!type) {
      return jsonError(400, "Invalid enquiry type");
    }

    const name = String(body.name || "").trim();
    const phoneDigits = String(body.phone || "").replace(/\D/g, "");
    const email = String(body.email || "").trim().toLowerCase();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    const country = String(body.country || "").trim();
    const state = String(body.state || "").trim();
    const city = String(body.city || "").trim();
    const siteUrl = String(body.siteUrl || body.site_url || "").trim();

    if (!name) return jsonError(400, "Full name is required");
    if (phoneDigits.length !== 10) {
      return jsonError(400, "Enter a valid 10-digit mobile number");
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return jsonError(400, "Enter a valid email address");
    }
    if (type === "contact" && !subject) {
      return jsonError(400, "Subject is required");
    }
    if (type === "franchise" && (!state || !city)) {
      return jsonError(400, "State and city are required");
    }
    if (!message) return jsonError(400, "Message is required");

    const mail = await sendEnquiryEmail({
      type,
      name,
      phone: phoneDigits,
      email,
      subject:
        subject ||
        (type === "franchise" ? "Franchise enquiry" : "Website enquiry"),
      message,
      country: country || undefined,
      state: state || undefined,
      city: city || undefined,
      siteUrl: siteUrl || undefined,
    });

    await saveEnquiryRow({
      enquiry_type: type,
      name,
      phone: phoneDigits,
      email,
      subject: type === "contact" ? subject : null,
      country: country || null,
      state: state || null,
      city: city || null,
      message,
      site_url: siteUrl || null,
      email_sent: mail.ok ? 1 : 0,
    });

    if (!mail.ok) {
      return jsonError(503, mail.error);
    }

    return jsonOk({
      sent: true,
      to: TO_EMAIL,
      type,
    });
  } catch (err) {
    console.error("[enquiries]", err);
    return jsonError(
      500,
      err instanceof Error ? err.message : "Failed to submit enquiry",
    );
  }
}
