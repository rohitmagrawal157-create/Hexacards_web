import { normalizeMobile } from "@/lib/users-db";

const DEFAULT_API_URL =
  "https://nimbusit.biz/api/SmsApi/SendSingleApi";

/** Must match the DLT-approved template character-for-character (except OTP). */
const DEFAULT_OTP_MSG_TEMPLATE =
  "Your Hexa Cards mobile number verification OTP is {otp}. This OTP is valid for 10 minutes. Do not share this OTP with anyone. https://hexacards.com";

export type NimbusSmsResult =
  | { ok: true; providerResponse: unknown }
  | { ok: false; error: string; providerResponse?: unknown };

/** Strip wrapping quotes — common when pasting secrets into Vercel / .env. */
function envSecret(name: string): string {
  return (process.env[name] ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

/**
 * DLT-approved OTP SMS body.
 * Override with NIMBUS_SMS_MSG_TEMPLATE (use `{otp}` placeholder) if the
 * registered DLT text differs — even a URL change will block delivery.
 */
export function buildHexaCardsOtpMessage(otp: string): string {
  const template =
    envSecret("NIMBUS_SMS_MSG_TEMPLATE") || DEFAULT_OTP_MSG_TEMPLATE;
  return template.replace(/\{otp\}/gi, otp);
}

export function isNimbusSmsConfigured(): boolean {
  return Boolean(
    envSecret("NIMBUS_SMS_USER_ID") &&
      envSecret("NIMBUS_SMS_PASSWORD") &&
      envSecret("NIMBUS_SMS_SENDER_ID") &&
      envSecret("NIMBUS_SMS_ENTITY_ID") &&
      envSecret("NIMBUS_SMS_TEMPLATE_ID"),
  );
}

function parseNimbusResponse(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return { raw: trimmed };
  }
}

function nimbusStatusOk(payload: unknown): boolean {
  if (payload == null) return false;

  if (typeof payload === "string") {
    const s = payload.trim().toUpperCase();
    return s === "OK" || s === "SUCCESS" || s.startsWith("OK");
  }

  if (typeof payload !== "object") return false;
  const row = payload as Record<string, unknown>;

  // Plain-text body wrapped as { raw: "OK" }
  if (typeof row.raw === "string") {
    const s = row.raw.trim().toUpperCase();
    if (s === "OK" || s === "SUCCESS" || s.startsWith("OK")) return true;
  }

  const status = String(
    row.Status ?? row.status ?? row.STATUS ?? row.Result ?? row.result ?? "",
  )
    .trim()
    .toUpperCase();

  if (status === "OK" || status === "SUCCESS" || status === "1") return true;

  // Some gateways return ErrorCode "0" / "000" for success
  const errCode = String(row.ErrorCode ?? row.errorCode ?? row.Code ?? "").trim();
  if (errCode === "0" || errCode === "000") return true;

  return false;
}

function providerErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const row = payload as Record<string, unknown>;
  for (const key of ["Message", "message", "Error", "error", "Description"]) {
    const value = row[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  if (typeof row.raw === "string" && row.raw.trim()) return row.raw.trim();
  return fallback;
}

/** Send OTP SMS via Nimbus IT (server-side only). */
export async function sendNimbusOtpSms(
  mobile: string,
  otp: string,
): Promise<NimbusSmsResult> {
  if (!isNimbusSmsConfigured()) {
    return { ok: false, error: "Nimbus SMS credentials are not configured" };
  }

  const phone10 = normalizeMobile(mobile);
  if (!/^[6-9]\d{9}$/.test(phone10)) {
    return { ok: false, error: "Invalid mobile number for SMS" };
  }

  // DLT routes usually want 10-digit; some panels need 91XXXXXXXXXX.
  const prefix = envSecret("NIMBUS_SMS_PHONE_PREFIX"); // e.g. "91"
  const phone = prefix ? `${prefix}${phone10}` : phone10;

  const userId = envSecret("NIMBUS_SMS_USER_ID");
  const password = envSecret("NIMBUS_SMS_PASSWORD");
  const senderId = envSecret("NIMBUS_SMS_SENDER_ID");
  const entityId = envSecret("NIMBUS_SMS_ENTITY_ID");
  const templateId = envSecret("NIMBUS_SMS_TEMPLATE_ID");
  const message = buildHexaCardsOtpMessage(otp);

  const apiUrl = envSecret("NIMBUS_SMS_API_URL") || DEFAULT_API_URL;
  const params = new URLSearchParams({
    UserID: userId,
    Password: password,
    SenderID: senderId,
    Phno: phone,
    Msg: message,
    EntityID: entityId,
    TemplateID: templateId,
  });
  const url = `${apiUrl}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    const text = await res.text();
    const providerResponse = parseNimbusResponse(text);

    if (!res.ok) {
      console.error("[nimbus-sms] HTTP error", res.status, text.slice(0, 500));
      return {
        ok: false,
        error: `SMS gateway HTTP ${res.status}`,
        providerResponse,
      };
    }

    if (!nimbusStatusOk(providerResponse)) {
      const message = providerErrorMessage(
        providerResponse,
        "SMS gateway rejected the OTP request",
      );
      console.error("[nimbus-sms] rejected", message, text.slice(0, 500));
      return { ok: false, error: message, providerResponse };
    }

    console.info(
      "[nimbus-sms] accepted",
      phone10,
      typeof providerResponse === "object"
        ? JSON.stringify(providerResponse).slice(0, 300)
        : String(providerResponse).slice(0, 300),
    );
    return { ok: true, providerResponse };
  } catch (err) {
    const raw = err instanceof Error ? err.message : "SMS request failed";
    // Node/undici often throws a bare "fetch failed" when the SMS host is
    // unreachable, DNS fails, or TLS is blocked from the Vercel region.
    const friendly =
      /fetch failed|network|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|AbortError|timeout/i.test(
        raw,
      )
        ? "Could not reach the SMS provider (Nimbus). Check NIMBUS_SMS_* credentials on Vercel, template/entity IDs, and that nimbusit.biz is reachable."
        : raw;
    console.error("[nimbus-sms] request failed", raw, err);
    return {
      ok: false,
      error: friendly,
    };
  }
}
