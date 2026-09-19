import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { repairDuplicateCardSlugs } from "@/lib/server/card-slug";

export const runtime = "nodejs";

/**
 * POST /api/cards/repair-slugs
 * Renumber colliding public links: keep oldest on base, later → base2, base3, …
 * Also syncs linked orders.card_slug / card_url.
 */
export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    const result = await repairDuplicateCardSlugs(supabase);
    return jsonOk(result);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Slug repair failed",
    );
  }
}
