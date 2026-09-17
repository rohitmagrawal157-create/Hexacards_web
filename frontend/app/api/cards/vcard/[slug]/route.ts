import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError } from "@/lib/admin-catalog-db";
import { mapCard } from "@/lib/server/card-types";
import {
  cardHasPublicPaymentEntitlement,
  findActiveCardRowBySlug,
} from "@/lib/server/card-by-slug";
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
    const { row, error } = await findActiveCardRowBySlug(supabase, slug);
    if (error) return jsonError(500, "Failed to load card", error);
    if (!row) return jsonError(404, "Card not found");

    const cardId = Number(row.card_id);
    const canonicalSlug = String(row.unic_card_name ?? "")
      .trim()
      .toLowerCase() || slug;

    const allowed = await cardHasPublicPaymentEntitlement(supabase, {
      cardId,
      slug: canonicalSlug,
    });
    if (!allowed) return jsonError(404, "Card not found");

    let card = mapCard({ ...row, unic_card_name: canonicalSlug });
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
