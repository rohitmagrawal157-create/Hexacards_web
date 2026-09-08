import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError } from "@/lib/admin-catalog-db";
import {
  CARD_COLS,
  CARD_COLS_LEGACY,
  CARD_COLS_NO_EXTRA,
  isAccentColumnMissingError,
  isExtraMobilesColumnMissingError,
  mapCard,
  type CardRow,
} from "@/lib/server/card-types";
import { isReservedRootSegment } from "@/lib/reserved-routes";
import { buildVCardFromCardDto } from "@/lib/server/card-vcard";
import {
  applyLinksToCard,
  fetchLinksForCard,
} from "@/lib/server/card-links-db";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/cards/vcard/[slug]
 * Downloads a .vcf for Save Contact (PHP generate_download equivalent).
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug: raw } = await context.params;
    const slug = decodeURIComponent(raw).trim().toLowerCase();
    if (!slug || isReservedRootSegment(slug)) {
      return jsonError(400, "Invalid card slug");
    }

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
    const { data: linkedOrders } = await supabase
      .from("orders")
      .select("payment_status")
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
      .limit(20);
    const orderRows =
      (linkedOrders as { payment_status: number }[] | null) ?? [];
    if (
      orderRows.length > 0 &&
      !orderRows.some((o) => Number(o.payment_status) === 1)
    ) {
      return jsonError(404, "Card not found");
    }

    let card = mapCard(row);
    try {
      const links = await fetchLinksForCard(supabase, card.cardId);
      card = applyLinksToCard(card, links);
    } catch {
      // links optional
    }

    const { vcf, filename } = buildVCardFromCardDto(card);
    const asciiName = filename.replace(/[^\x20-\x7E]/g, "_");

    return new Response(vcf, {
      status: 200,
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Failed to build contact file",
    );
  }
}
