import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  LINK_COLS,
  mapLink,
  type LinkRow,
} from "@/lib/server/link-types";
import {
  extractLinksFromBody,
  upsertCardLinks,
} from "@/lib/server/card-links-db";
import type { CardCreateBody } from "@/lib/server/card-types";

/**
 * GET /api/links?card_id=123
 * List all links for a card from the `links` table.
 */
export async function GET(request: Request) {
  try {
    const cardId = Number(new URL(request.url).searchParams.get("card_id"));
    if (!Number.isInteger(cardId) || cardId <= 0) {
      return jsonError(400, "card_id query param is required");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("links")
      .select(LINK_COLS)
      .eq("card_id", cardId)
      .order("sort_order", { ascending: true });

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "links table missing — run frontend/sql/links-table.sql in Supabase",
        );
      }
      return jsonError(500, "Failed to load links", error.message);
    }

    return jsonOk(((data as LinkRow[] | null) ?? []).map(mapLink));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}

/**
 * POST /api/links
 * Body: { cardId, ...link fields } or { cardId, links: [...] }
 * Upserts into `links` for that card.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CardCreateBody & {
      cardId?: number;
      card_id?: number;
    };
    const cardId = Number(body.cardId ?? body.card_id);
    if (!Number.isInteger(cardId) || cardId <= 0) {
      return jsonError(400, "cardId is required");
    }

    const values = extractLinksFromBody(body);
    if (Object.keys(values).length === 0) {
      return jsonError(400, "No link fields provided");
    }

    const supabase = getSupabaseAdmin();
    const { data: card, error: cardErr } = await supabase
      .from("cards")
      .select("card_id")
      .eq("card_id", cardId)
      .maybeSingle();

    if (cardErr) return jsonError(500, "Failed to verify card", cardErr.message);
    if (!card) return jsonError(404, "Card not found");

    try {
      const links = await upsertCardLinks(supabase, cardId, values);
      return jsonOk({ cardId, links });
    } catch (err) {
      return jsonError(
        500,
        "Failed to save links — run frontend/sql/links-table.sql",
        err instanceof Error ? err.message : undefined,
      );
    }
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
