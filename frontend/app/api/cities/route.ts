import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { mapCity, type CityRow } from "@/lib/server/location-types";

/**
 * GET /api/cities
 * Optional: ?state_id=22  (filter by state)
 * Optional: ?all=1 to include inactive / blank names
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateIdRaw = searchParams.get("state_id");
    const includeAll = searchParams.get("all") === "1";

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("city")
      .select("city_id, city_name, state_id, status")
      .order("city_name", { ascending: true });

    if (stateIdRaw) {
      const stateId = Number(stateIdRaw);
      if (!Number.isInteger(stateId) || stateId <= 0) {
        return jsonError(400, "state_id must be a positive integer");
      }
      query = query.eq("state_id", stateId);
    }

    if (!includeAll) {
      query = query.eq("status", 1).neq("city_name", "");
    }

    const { data, error } = await query;

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "city table missing — run schema.sql then city-seed.sql in Supabase",
        );
      }
      return jsonError(500, "Failed to load cities", error.message);
    }

    return jsonOk((data as CityRow[] | null ?? []).map(mapCity));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
