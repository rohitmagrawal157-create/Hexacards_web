import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  mapCardTheme,
  type CardThemeRow,
} from "@/lib/server/card-theme-types";

/**
 * GET /api/card-themes
 * Active themes by default. ?all=1 includes inactive.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("all") === "1";

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("card_theme")
      .select("theme_id, theme_name, theme_path, status")
      .order("theme_id", { ascending: true });

    if (!includeAll) query = query.eq("status", 1);

    const { data, error } = await query;

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "card_theme table missing — run frontend/sql/card-theme-seed.sql in Supabase",
        );
      }
      return jsonError(500, "Failed to load themes", error.message);
    }

    return jsonOk((data as CardThemeRow[] | null ?? []).map(mapCardTheme));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
