import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { CARD_COLS, mapCard, type CardRow } from "@/lib/server/card-types";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/cards/by-slug/[slug]
 * Public card lookup by unic_card_name; increments page_view.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw).trim().toLowerCase();
    if (!slug) return jsonError(400, "slug is required");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("cards")
      .select(CARD_COLS)
      .eq("unic_card_name", slug)
      .eq("status", 1)
      .maybeSingle();

    if (error) return jsonError(500, "Failed to load card", error.message);
    if (!data) return jsonError(404, "Card not found");

    const row = data as CardRow;
    const nextViews = (Number(row.page_view) || 0) + 1;
    await supabase
      .from("cards")
      .update({ page_view: nextViews })
      .eq("card_id", row.card_id);

    return jsonOk(mapCard({ ...row, page_view: nextViews }));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
