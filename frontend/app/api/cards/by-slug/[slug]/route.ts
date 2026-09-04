import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { isCardPastEndDate } from "@/lib/card-validity";
import { CARD_COLS, CARD_COLS_LEGACY, isAccentColumnMissingError, mapCard, type CardRow } from "@/lib/server/card-types";
import {
  applyLinksToCard,
  fetchLinksForCard,
} from "@/lib/server/card-links-db";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/cards/by-slug/[slug]
 * Public card lookup by unic_card_name; increments page_view.
 * Links loaded from `links` table (social, brochure, website).
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw).trim().toLowerCase();
    if (!slug) return jsonError(400, "slug is required");

    const countView =
      new URL(request.url).searchParams.get("count") !== "0";

    const supabase = getSupabaseAdmin();
    let { data, error } = await supabase
      .from("cards")
      .select(CARD_COLS)
      .eq("unic_card_name", slug)
      .eq("status", 1)
      .maybeSingle();

    if (error && isAccentColumnMissingError(error.message)) {
      ({ data, error } = await supabase
        .from("cards")
        .select(CARD_COLS_LEGACY)
        .eq("unic_card_name", slug)
        .eq("status", 1)
        .maybeSingle());
    }

    if (error) return jsonError(500, "Failed to load card", error.message);
    if (!data) return jsonError(404, "Card not found");

    const row = data as CardRow;
    if (row.end_date && isCardPastEndDate(row.end_date)) {
      return jsonError(410, "This profile has expired");
    }

    let pageView = Number(row.page_view) || 0;
    if (countView) {
      pageView += 1;
      void supabase
        .from("cards")
        .update({ page_view: pageView })
        .eq("card_id", row.card_id);
    }

    const card = mapCard({ ...row, page_view: pageView });
    const links = await fetchLinksForCard(supabase, card.cardId);
    return jsonOk(applyLinksToCard(card, links));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
