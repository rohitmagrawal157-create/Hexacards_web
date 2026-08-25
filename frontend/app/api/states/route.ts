import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { mapState, type StateRow } from "@/lib/server/location-types";

/**
 * GET /api/states
 * Optional: ?country_id=1 (default India)
 * Optional: ?all=1 to include inactive
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = Number(searchParams.get("country_id") || "1");
    const includeAll = searchParams.get("all") === "1";

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("state")
      .select("state_id, state_name, state_type, status, country_id")
      .eq("country_id", countryId)
      .order("state_id", { ascending: true });

    if (!includeAll) query = query.eq("status", 1);

    const { data, error } = await query;

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "state table missing — run schema.sql then state-seed.sql in Supabase",
        );
      }
      return jsonError(500, "Failed to load states", error.message);
    }

    return jsonOk((data as StateRow[] | null ?? []).map(mapState));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
