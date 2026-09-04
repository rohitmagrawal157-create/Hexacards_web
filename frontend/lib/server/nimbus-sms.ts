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

/** Strip wrapping quotes — common when pasting secrets into Vercel / .env. */
function envSecret(name: string): string {
  return (process.env[name] ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
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

  const userId = envSecret("NIMBUS_SMS_USER_ID");
  const password = envSecret("NIMBUS_SMS_PASSWORD");
  const senderId = envSecret("NIMBUS_SMS_SENDER_ID");
  const entityId = envSecret("NIMBUS_SMS_ENTITY_ID");
  const templateId = envSecret("NIMBUS_SMS_TEMPLATE_ID");
  const message = buildHexaCardsOtpMessage(otp);

  const apiUrl =
    envSecret("NIMBUS_SMS_API_URL") || DEFAULT_API_URL;
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
