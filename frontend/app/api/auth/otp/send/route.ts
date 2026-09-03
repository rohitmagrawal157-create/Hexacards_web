import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  isNimbusSmsConfigured,
  sendNimbusOtpSms,
} from "@/lib/server/nimbus-sms";
import type { OtpSendBody, UserRow } from "@/lib/server/user-types";
import {
  generateOtp,
  isSmsOtpEnabled,
  isValidIndianMobile,
  mapUser,
  normalizeMobile,
  OTP_VALID_MINUTES,
  otpExpiryIso,
  USER_SAFE_COLS,
} from "@/lib/users-db";

/**
 * POST /api/auth/otp/send
 * Body: { firstName, lastName, mobile }
 *
 * 1. Validate name + Indian mobile
 * 2. Generate 6-digit OTP + expiry (10 min)
 * 3. Create or update user row in Supabase
 * 4. Send SMS via Nimbus (enabled when OTP_SMS_ENABLED=true or credentials are set)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as OtpSendBody;

    const firstName = String(body.firstName ?? body.first_name ?? "").trim();
    const lastName = String(body.lastName ?? body.last_name ?? "").trim();
    const mobile = normalizeMobile(String(body.mobile ?? ""));

    if (!firstName) return jsonError(400, "first_name is required");
    if (!isValidIndianMobile(mobile)) {
      return jsonError(400, "Valid 10-digit mobile number is required");
    }

    if (!isSmsOtpEnabled() || !isNimbusSmsConfigured()) {
      return jsonError(
        503,
        "SMS OTP is not configured on the server. Set OTP_SMS_ENABLED=true and NIMBUS_SMS_* in Vercel → Settings → Environment Variables (Production), then Redeploy. Local: add them to frontend/.env.local and restart npm run dev.",
      );
    }

    const otp = generateOtp();
    const otpExpiry = otpExpiryIso(OTP_VALID_MINUTES);
    const supabase = getSupabaseAdmin();

    const { data: existing, error: findErr } = await supabase
      .from("users")
      .select("user_id")
      .eq("mobile", mobile)
      .maybeSingle();

    if (findErr) {
      return jsonError(500, "Failed to look up user", findErr.message);
    }

    let row: UserRow;

    if (existing?.user_id) {
      const { data, error } = await supabase
        .from("users")
        .update({
          first_name: firstName,
          last_name: lastName,
          otp,
          otp_expiry: otpExpiry,
        })
        .eq("user_id", existing.user_id)
        .select(USER_SAFE_COLS)
        .single();

      if (error) return jsonError(500, "Failed to update OTP", error.message);
      row = data as UserRow;
    } else {
      const { data, error } = await supabase
        .from("users")
        .insert({
          first_name: firstName,
          last_name: lastName,
          mobile,
          otp,
          otp_expiry: otpExpiry,
        })
        .select(USER_SAFE_COLS)
        .single();

      if (error) {
        if (error.code === "23505") {
          return jsonError(409, "mobile number already registered");
        }
        return jsonError(500, "Failed to create user", error.message);
      }
      row = data as UserRow;
    }

    const sms = await sendNimbusOtpSms(mobile, otp);
    if (!sms.ok) {
      console.error("Nimbus OTP SMS failed", sms.error, sms.providerResponse);
      return jsonError(
        502,
        sms.error || "Could not send OTP SMS. Please try again in a moment.",
      );
    }

    return jsonOk({
      user: mapUser(row),
      otpExpiresAt: otpExpiry,
      otpValidMinutes: OTP_VALID_MINUTES,
      smsSent: true,
    });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
