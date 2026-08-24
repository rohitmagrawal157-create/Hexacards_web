import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import type { UserRow, UserUpdateBody } from "@/lib/server/user-types";
import {
  hashPassword,
  isValidIndianMobile,
  mapUser,
  normalizeMobile,
  parseUserId,
  USER_SAFE_COLS,
} from "@/lib/users-db";

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/users/[id] ─────────────────────────────────────────────────────

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = parseUserId(id);
    if (!userId) return jsonError(400, "user_id must be a positive integer");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select(USER_SAFE_COLS)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return jsonError(500, "Failed to load user", error.message);
    if (!data)  return jsonError(404, "User not found");

    return jsonOk(mapUser(data as UserRow));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}

// ── PATCH /api/users/[id] ───────────────────────────────────────────────────

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = parseUserId(id);
    if (!userId) return jsonError(400, "user_id must be a positive integer");

    const body = (await request.json().catch(() => ({}))) as UserUpdateBody;
    const payload: Record<string, unknown> = {};

    if (body.firstName !== undefined || body.first_name !== undefined) {
      const v = String(body.firstName ?? body.first_name ?? "").trim();
      if (!v) return jsonError(400, "first_name cannot be empty");
      payload.first_name = v;
    }
    if (body.lastName !== undefined || body.last_name !== undefined) {
      payload.last_name = String(body.lastName ?? body.last_name ?? "").trim();
    }
    if (body.mobile !== undefined) {
      const mobile = normalizeMobile(String(body.mobile));
      if (!isValidIndianMobile(mobile)) {
        return jsonError(400, "Valid 10-digit mobile number is required");
      }
      payload.mobile = mobile;
    }
    if (body.email !== undefined) {
      payload.email = body.email ? String(body.email).trim() || null : null;
    }
    if (body.password !== undefined && body.password) {
      payload.password = hashPassword(String(body.password));
    }
    if (body.isMobile !== undefined || body.is_mobile !== undefined) {
      payload.is_mobile = Number(body.isMobile ?? body.is_mobile) ? 1 : 0;
    }
    if (body.isEmail !== undefined || body.is_email !== undefined) {
      payload.is_email = Number(body.isEmail ?? body.is_email) ? 1 : 0;
    }
    if (body.status !== undefined) {
      payload.status = Number(body.status) ? 1 : 0;
    }

    if (Object.keys(payload).length === 0) {
      return jsonError(400, "No fields to update");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("user_id", userId)
      .select(USER_SAFE_COLS)
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return jsonError(409, "mobile number already registered");
      }
      return jsonError(500, "Failed to update user", error.message);
    }
    if (!data) return jsonError(404, "User not found");

    return jsonOk(mapUser(data as UserRow));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}

// ── DELETE /api/users/[id] ──────────────────────────────────────────────────

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = parseUserId(id);
    if (!userId) return jsonError(400, "user_id must be a positive integer");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

    if (error) return jsonError(500, "Failed to delete user", error.message);
    if (!data)  return jsonError(404, "User not found");

    return jsonOk({ userId: Number(data.user_id) });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
