import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import type { OtpVerifyBody, UserRow, UserSessionRow } from "@/lib/server/user-types";
import {
  createSessionIds,
  isOtpExpired,
  isValidIndianMobile,
  mapSession,
  mapUser,
  normalizeMobile,
  SESSION_COLS,
  USER_SAFE_COLS,
  USER_OTP_COLS,
} from "@/lib/users-db";

/**
 * POST /api/auth/otp/verify
 * Body: { mobile, otp }
 *
 * Verifies OTP, clears it, marks is_mobile = 1,
 * creates a user_session row, returns user + session.
 */
export async function POST(request: Request) {
  try {
    const body   = (await request.json().catch(() => ({}))) as OtpVerifyBody;
    const mobile = normalizeMobile(String(body.mobile ?? ""));
    const otp    = String(body.otp ?? "").trim();

    if (!isValidIndianMobile(mobile)) {
      return jsonError(400, "Valid 10-digit mobile number is required");
    }
    if (!/^\d{6}$/.test(otp)) {
      return jsonError(400, "Valid 6-digit otp is required");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select(USER_OTP_COLS)
      .eq("mobile", mobile)
      .maybeSingle();

    if (error) return jsonError(500, "Failed to verify OTP", error.message);
    if (!data)  return jsonError(404, "User not found — please request OTP first");

    const row = data as UserRow;

    if (!row.otp || row.otp !== otp) {
      return jsonError(401, "Invalid OTP");
    }
    if (isOtpExpired(row.otp_expiry)) {
      return jsonError(401, "OTP expired — request a new one");
    }

    // Clear OTP and mark mobile verified
    const { data: updated, error: updateErr } = await supabase
      .from("users")
      .update({ otp: null, otp_expiry: null, is_mobile: 1 })
      .eq("user_id", row.user_id)
      .select(USER_SAFE_COLS)
      .single();

    if (updateErr) {
      return jsonError(500, "Failed to complete login", updateErr.message);
    }

    const user = mapUser(updated as UserRow);
    const { sessionId, sessionToken } = createSessionIds();

    const { data: sessionRow, error: sessionErr } = await supabase
      .from("user_session")
      .insert({
        session_id: sessionId,
        session_token: sessionToken,
        user_id: user.userId,
      })
      .select(SESSION_COLS)
      .single();

    if (sessionErr) {
      return jsonError(500, "Failed to create session", sessionErr.message);
    }

    return jsonOk({
      ...user,
      session: mapSession(sessionRow as UserSessionRow),
    });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
