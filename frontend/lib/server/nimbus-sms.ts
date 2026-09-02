import { normalizeMobile } from "@/lib/users-db";

const DEFAULT_API_URL =
  "https://nimbusit.biz/api/SmsApi/SendSingleApi";

export type NimbusSmsResult =
  | { ok: true; providerResponse: unknown }
  | { ok: false; error: string; providerResponse?: unknown };

/** DLT-approved OTP template — must match Nimbus / TRAI registration exactly. */
export function buildHexaCardsOtpMessage(otp: string): string {
  return `Your Hexa Cards mobile number verification OTP is ${otp}. This OTP is valid for 10 minutes. Do not share this OTP with anyone. https://hexacards.com`;
}

export function isNimbusSmsConfigured(): boolean {
  return Boolean(
    process.env.NIMBUS_SMS_USER_ID?.trim() &&
      process.env.NIMBUS_SMS_PASSWORD?.trim() &&
      process.env.NIMBUS_SMS_SENDER_ID?.trim() &&
      process.env.NIMBUS_SMS_ENTITY_ID?.trim() &&
      process.env.NIMBUS_SMS_TEMPLATE_ID?.trim(),
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
  if (!payload || typeof payload !== "object") return false;
  const status = String(
    (payload as Record<string, unknown>).Status ??
      (payload as Record<string, unknown>).status ??
      "",
  ).toUpperCase();
  return status === "OK" || status === "SUCCESS";
}

/** Send OTP SMS via Nimbus IT (server-side only). */
export async function sendNimbusOtpSms(
  mobile: string,
  otp: string,
): Promise<NimbusSmsResult> {
  if (!isNimbusSmsConfigured()) {
    return { ok: false, error: "Nimbus SMS credentials are not configured" };
  }

  const phone = normalizeMobile(mobile);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return { ok: false, error: "Invalid mobile number for SMS" };
  }

  // Match PHP integration: only Msg is urlencoded; other params are concatenated as-is.
  const userId = process.env.NIMBUS_SMS_USER_ID!.trim();
  const password = process.env.NIMBUS_SMS_PASSWORD!.trim();
  const senderId = process.env.NIMBUS_SMS_SENDER_ID!.trim();
  const entityId = process.env.NIMBUS_SMS_ENTITY_ID!.trim();
  const templateId = process.env.NIMBUS_SMS_TEMPLATE_ID!.trim();
  const message = buildHexaCardsOtpMessage(otp);

  const apiUrl =
    process.env.NIMBUS_SMS_API_URL?.trim() || DEFAULT_API_URL;
  const url =
    `${apiUrl}?UserID=${userId}` +
    `&Password=${password}` +
    `&SenderID=${senderId}` +
    `&Phno=${phone}` +
    `&Msg=${encodeURIComponent(message)}` +
    `&EntityID=${entityId}` +
    `&TemplateID=${templateId}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    const text = await res.text();
    const providerResponse = parseNimbusResponse(text);

    if (!res.ok) {
      return {
        ok: false,
        error: `SMS gateway HTTP ${res.status}`,
        providerResponse,
      };
    }

    if (!nimbusStatusOk(providerResponse)) {
      const message =
        providerResponse &&
        typeof providerResponse === "object" &&
        "Message" in providerResponse
          ? String((providerResponse as Record<string, unknown>).Message)
          : "SMS gateway rejected the OTP request";
      return { ok: false, error: message, providerResponse };
    }

    return { ok: true, providerResponse };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SMS request failed",
    };
  }
}
