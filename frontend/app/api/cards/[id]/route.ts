import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  CARD_COLS,
  mapCard,
  type CardRow,
  type CardUpdateBody,
} from "@/lib/server/card-types";
import {
  applyLinksToCard,
  extractLinksFromBody,
  fetchLinksForCard,
  stripLinkFieldsFromCardPayload,
  upsertCardLinks,
} from "@/lib/server/card-links-db";

type RouteContext = { params: Promise<{ id: string }> };

function parseCardId(id: string): number | null {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cardId = parseCardId(id);
    if (!cardId) return jsonError(400, "card_id must be a positive integer");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("cards")
      .select(CARD_COLS)
      .eq("card_id", cardId)
      .maybeSingle();

    if (error) return jsonError(500, "Failed to load card", error.message);
    if (!data) return jsonError(404, "Card not found");

    const card = mapCard(data as CardRow);
    const links = await fetchLinksForCard(supabase, cardId);
    return jsonOk(applyLinksToCard(card, links));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cardId = parseCardId(id);
    if (!cardId) return jsonError(400, "card_id must be a positive integer");

    const body = (await request.json().catch(() => ({}))) as CardUpdateBody;
    const payload: Record<string, unknown> = {};

    const set = (col: string, val: unknown) => {
      payload[col] = val;
    };

    if (body.unicCardName !== undefined || body.unic_card_name !== undefined) {
      const v = String(body.unicCardName ?? body.unic_card_name ?? "").trim();
      if (!v) return jsonError(400, "unic_card_name cannot be empty");
      set("unic_card_name", v);
    }
    if (body.cardName !== undefined || body.card_name !== undefined) {
      set("card_name", String(body.cardName ?? body.card_name ?? "").trim());
    }
    if (body.jobName !== undefined || body.job_name !== undefined) {
      set("job_name", String(body.jobName ?? body.job_name ?? "").trim());
    }
    if (body.businessName !== undefined || body.business_name !== undefined) {
      set("business_name", String(body.businessName ?? body.business_name ?? "").trim());
    }
    if (body.logo !== undefined) set("logo", body.logo || null);
    if (body.bgImg !== undefined || body.bg_img !== undefined) {
      set("bg_img", body.bgImg ?? body.bg_img ?? null);
    }
    if (body.bgUrl !== undefined || body.bg_url !== undefined) {
      set("bg_url", body.bgUrl ?? body.bg_url ?? null);
    }
    if (body.themeId !== undefined || body.theme_id !== undefined) {
      set("theme_id", Number(body.themeId ?? body.theme_id) || 1);
    }
    if (body.mobile !== undefined) set("mobile", String(body.mobile ?? "").trim());
    if (body.email !== undefined) set("email", body.email ? String(body.email).trim() : null);
    if (body.code !== undefined) set("code", String(body.code || "91").trim() || "91");
    if (body.whatsapp !== undefined) {
      set("whatsapp", body.whatsapp ? String(body.whatsapp).trim() : null);
    }
    if (body.stateId !== undefined || body.state_id !== undefined) {
      const sid = body.stateId ?? body.state_id;
      set("state_id", sid == null ? null : Number(sid));
    }
    if (body.cityId !== undefined || body.city_id !== undefined) {
      const cid = body.cityId ?? body.city_id;
      set("city_id", cid == null ? null : Number(cid));
    }
    if (body.address !== undefined) set("address", body.address || null);
    if (body.about !== undefined) set("about", body.about || null);
    if (body.aboutCompany !== undefined || body.about_company !== undefined) {
      set("about_company", body.aboutCompany ?? body.about_company ?? null);
    }
    if (body.services !== undefined) set("services", body.services || null);
    if (body.startDate !== undefined || body.start_date !== undefined) {
      set("start_date", body.startDate ?? body.start_date ?? null);
    }
    if (body.endDate !== undefined || body.end_date !== undefined) {
      set("end_date", body.endDate ?? body.end_date ?? null);
    }
    if (body.status !== undefined) set("status", Number(body.status) ? 1 : 0);

    const linkValues = extractLinksFromBody(body);
    const cardPayload = stripLinkFieldsFromCardPayload(payload);
    const hasCardFields = Object.keys(cardPayload).length > 0;
    const hasLinkFields = Object.keys(linkValues).length > 0;

    if (!hasCardFields && !hasLinkFields) {
      return jsonError(400, "No fields to update");
    }

    const supabase = getSupabaseAdmin();
    let cardRow: CardRow | null = null;

    if (hasCardFields) {
      const { data, error } = await supabase
        .from("cards")
        .update(cardPayload)
        .eq("card_id", cardId)
        .select(CARD_COLS)
        .maybeSingle();

      if (error) {
        if (error.code === "23505") {
          return jsonError(409, "unic_card_name already exists");
        }
        return jsonError(500, "Failed to update card", error.message);
      }
      if (!data) return jsonError(404, "Card not found");
      cardRow = data as CardRow;
    } else {
      const { data, error } = await supabase
        .from("cards")
        .select(CARD_COLS)
        .eq("card_id", cardId)
        .maybeSingle();
      if (error) return jsonError(500, "Failed to load card", error.message);
      if (!data) return jsonError(404, "Card not found");
      cardRow = data as CardRow;
    }

    let links = await fetchLinksForCard(supabase, cardId);
    if (hasLinkFields) {
      try {
        links = await upsertCardLinks(supabase, cardId, linkValues);
      } catch (err) {
        return jsonError(
          500,
          "Failed to update links — run frontend/sql/links-table.sql",
          err instanceof Error ? err.message : undefined,
        );
      }
    }

    return jsonOk(applyLinksToCard(mapCard(cardRow), links));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cardId = parseCardId(id);
    if (!cardId) return jsonError(400, "card_id must be a positive integer");

    const supabase = getSupabaseAdmin();
    // links cascade via FK on delete
    const { data, error } = await supabase
      .from("cards")
      .delete()
      .eq("card_id", cardId)
      .select("card_id")
      .maybeSingle();

    if (error) return jsonError(500, "Failed to delete card", error.message);
    if (!data) return jsonError(404, "Card not found");

    return jsonOk({ cardId: Number(data.card_id) });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
