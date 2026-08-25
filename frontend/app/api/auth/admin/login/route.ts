import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  mapAdmin,
  ADMIN_SAFE_COLS,
  type AdminLoginBody,
  type AdminRow,
} from "@/lib/server/admin-types";
import { verifyPassword } from "@/lib/users-db";

/**
 * POST /api/auth/admin/login
 * Body: { email, password }
 * Verifies against public.admin (status must be 1).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AdminLoginBody;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email) return jsonError(400, "email is required");
    if (!password) return jsonError(400, "password is required");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("admin")
      .select("aid, fname, lname, email, mobile, password, profile, status")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "admin table missing — run schema.sql then admin-seed.sql in Supabase",
        );
      }
      return jsonError(500, "Failed to login", error.message);
    }

    if (!data) return jsonError(401, "Invalid email or password");

    const row = data as AdminRow;
    if (Number(row.status) !== 1) {
      return jsonError(403, "Admin account is inactive");
    }
    if (!verifyPassword(password, row.password)) {
      return jsonError(401, "Invalid email or password");
    }

    return jsonOk({
      admin: mapAdmin(row),
      name: [row.fname, row.lname].filter(Boolean).join(" ").trim() || "Admin",
    });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
