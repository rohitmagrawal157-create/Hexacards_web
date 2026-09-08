import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { isCardPastEndDate } from "@/lib/card-validity";
import { CARD_COLS, CARD_COLS_LEGACY, CARD_COLS_NO_EXTRA, isAccentColumnMissingError, isExtraMobilesColumnMissingError, mapCard, type CardRow } from "@/lib/server/card-types";
import {
  applyLinksToCard,
  fetchLinksForCard,
} from "@/lib/server/card-links-db";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/cards/by-slug/[slug]
 * Public card lookup by unic_card_name; increments page_view.
 * Links loaded from `links` table (social, brochure, website).
 * Cards linked to unpaid / failed orders are not publicly served.
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

    if (error && isExtraMobilesColumnMissingError(error.message)) {
      ({ data, error } = await supabase
        .from("cards")
        .select(CARD_COLS_NO_EXTRA)
        .eq("unic_card_name", slug)
        .eq("status", 1)
        .maybeSingle());
    }

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
    const cardId = Number(row.card_id);

    // Payment gate + links in parallel (was sequential → slower "Loading card…")
    const [linkedOrdersResult, links] = await Promise.all([
      supabase
        .from("orders")
        .select("payment_status, card_id, card_slug")
        .or(
          [
            `card_slug.eq.${slug}`,
            Number.isFinite(cardId) && cardId > 0
              ? `card_id.eq.${cardId}`
              : null,
          ]
            .filter(Boolean)
            .join(","),
        )
        .limit(20),
      fetchLinksForCard(supabase, cardId),
    ]);

    const orderRows =
      (linkedOrdersResult.data as { payment_status: number }[] | null) ?? [];
    if (
      orderRows.length > 0 &&
      !orderRows.some((o) => Number(o.payment_status) === 1)
    ) {
      return jsonError(404, "Card not found");
    }

    if (row.end_date && isCardPastEndDate(row.end_date)) {
      return jsonError(410, "This profile has expired");
    }

    let pageView = Number(row.page_view) || 0;
    if (countView) {
      pageView += 1;
      // Fire-and-forget view increment — never block the card response
      void supabase
        .from("cards")
        .update({ page_view: pageView })
        .eq("card_id", row.card_id);
    }

    const card = mapCard({ ...row, page_view: pageView });
    return jsonOk(applyLinksToCard(card, links));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
