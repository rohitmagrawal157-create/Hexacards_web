import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  mapAdmin,
  ADMIN_SAFE_COLS,
  type AdminRow,
} from "@/lib/server/admin-types";

/**
 * GET /api/admins
 * Lists active admins (no passwords).
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("admin")
      .select(ADMIN_SAFE_COLS)
      .order("aid", { ascending: true });

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
      return jsonError(500, "Failed to load admins", error.message);
    }

    return jsonOk((data as AdminRow[] | null ?? []).map(mapAdmin));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
