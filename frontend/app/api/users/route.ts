import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import type { UserCreateBody, UserRow } from "@/lib/server/user-types";
import {
  hashPassword,
  isValidIndianMobile,
  mapUser,
  mobileFromBody,
  normalizeMobile,
  USER_SAFE_COLS,
} from "@/lib/users-db";

// ── GET /api/users ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select(USER_SAFE_COLS)
      .order("user_id", { ascending: true });

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "users table missing — run frontend/sql/schema.sql in Supabase SQL Editor",
        );
      }
      return jsonError(500, "Failed to load users", error.message);
    }

    return jsonOk((data as UserRow[] ?? []).map(mapUser));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}

// ── POST /api/users ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as UserCreateBody;

    const firstName  = String(body.firstName  ?? body.first_name  ?? "").trim();
    const lastName   = String(body.lastName   ?? body.last_name   ?? "").trim();
    const mobile     = mobileFromBody(body as { mobile?: string });
    const email      = body.email ? String(body.email).trim() || null : null;
    const passwordRaw = body.password ? String(body.password) : "";
    const createdBy  = body.createdBy ?? body.created_by ?? null;

    if (!firstName) return jsonError(400, "first_name is required");
    if (!isValidIndianMobile(mobile)) {
      return jsonError(400, "Valid 10-digit mobile number is required");
    }

    const supabase = getSupabaseAdmin();
    const payload = {
      first_name:  firstName,
      last_name:   lastName,
      mobile:      normalizeMobile(mobile),
      email,
      password:    passwordRaw ? hashPassword(passwordRaw) : null,
      created_by:  createdBy ? Number(createdBy) : null,
      otp:         null,
      otp_expiry:  null,
    };

    const { data, error } = await supabase
      .from("users")
      .insert(payload)
      .select(USER_SAFE_COLS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return jsonError(409, "mobile number already registered");
      }
      return jsonError(500, "Failed to create user", error.message);
    }

    return jsonOk(mapUser(data as UserRow), 201);
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
