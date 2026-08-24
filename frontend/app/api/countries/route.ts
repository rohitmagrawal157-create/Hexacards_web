import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { mapCountry, type CountryRow } from "@/lib/server/country-types";

/**
 * GET /api/countries
 * Returns active countries (status = 1), India first then by nicename.
 * Optional: ?all=1 to include inactive.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("all") === "1";

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("country")
      .select(
        "country_id, iso, country_name, nicename, iso3, numcode, phonecode, status",
      )
      .order("country_id", { ascending: true });

    if (!includeAll) {
      query = query.eq("status", 1);
    }

    const { data, error } = await query;

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "country table missing — run frontend/sql/schema.sql then frontend/sql/country-seed.sql in Supabase",
        );
      }
      return jsonError(500, "Failed to load countries", error.message);
    }

    return jsonOk((data as CountryRow[] | null ?? []).map(mapCountry));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
