import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import type { OtpSendBody, UserRow } from "@/lib/server/user-types";
import {
  generateOtp,
  isDemoOtpMode,
  isValidIndianMobile,
  mapUser,
  normalizeMobile,
  otpExpiryIso,
  USER_SAFE_COLS,
} from "@/lib/users-db";

/**
 * POST /api/auth/otp/send
 * Body: { firstName, lastName, mobile }
 *
 * Creates user row if first visit, then writes otp + otp_expiry.
 * In development, demoOtp is included in the response (always 123456).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as OtpSendBody;

    const firstName = String(body.firstName ?? body.first_name ?? "").trim();
    const lastName  = String(body.lastName  ?? body.last_name  ?? "").trim();
    const mobile    = normalizeMobile(String(body.mobile ?? ""));

    if (!firstName) return jsonError(400, "first_name is required");
    if (!isValidIndianMobile(mobile)) {
      return jsonError(400, "Valid 10-digit mobile number is required");
    }

    const otp       = generateOtp();
    const otpExpiry = otpExpiryIso(5);
    const supabase  = getSupabaseAdmin();

    // Check if user already exists by mobile
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
      // Existing user — refresh name + OTP
      const { data, error } = await supabase
        .from("users")
        .update({ first_name: firstName, last_name: lastName, otp, otp_expiry: otpExpiry })
        .eq("user_id", existing.user_id)
        .select(USER_SAFE_COLS)
        .single();

      if (error) return jsonError(500, "Failed to update OTP", error.message);
      row = data as UserRow;
    } else {
      // New user — insert
      const { data, error } = await supabase
        .from("users")
        .insert({
          first_name: firstName,
          last_name:  lastName,
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

    const isDev = process.env.NODE_ENV !== "production";
    const showDemo = isDev || isDemoOtpMode();

    return jsonOk({
      user:         mapUser(row),
      otpExpiresAt: otpExpiry,
      ...(showDemo ? { demoOtp: otp } : {}),
    });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
