import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { isCardPastEndDate } from "@/lib/card-validity";
import { mapCard } from "@/lib/server/card-types";
import {
  cardHasPublicPaymentEntitlement,
  findActiveCardRowBySlug,
} from "@/lib/server/card-by-slug";
import {
  applyLinksToCard,
  fetchLinksForCard,
} from "@/lib/server/card-links-db";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/cards/by-slug/[slug]
 * Public card lookup by unic_card_name (case-insensitive); increments page_view.
 * Links loaded from `links` table (social, brochure, website).
 * Cards linked only to unpaid / failed orders are not publicly served.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw).trim().toLowerCase();
    if (!slug) return jsonError(400, "slug is required");

    const countView =
      new URL(request.url).searchParams.get("count") !== "0";

    const supabase = getSupabaseAdmin();
    const { row, error } = await findActiveCardRowBySlug(supabase, slug);
    if (error) return jsonError(500, "Failed to load card", error);
    if (!row) return jsonError(404, "Card not found");

    const cardId = Number(row.card_id);
    const canonicalSlug = String(row.unic_card_name ?? "")
      .trim()
      .toLowerCase() || slug;

    const [allowed, links] = await Promise.all([
      cardHasPublicPaymentEntitlement(supabase, {
        cardId,
        slug: canonicalSlug,
      }),
      fetchLinksForCard(supabase, cardId),
    ]);

    if (!allowed) return jsonError(404, "Card not found");

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

    // Heal legacy mixed-case slugs so future exact lookups succeed
    if (
      String(row.unic_card_name ?? "").trim() !== canonicalSlug &&
      canonicalSlug
    ) {
      void supabase
        .from("cards")
        .update({ unic_card_name: canonicalSlug })
        .eq("card_id", row.card_id);
    }

    const card = mapCard({ ...row, page_view: pageView, unic_card_name: canonicalSlug });
    return jsonOk(applyLinksToCard(card, links));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
