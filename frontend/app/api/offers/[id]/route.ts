import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { saveCardImage } from "@/lib/server/card-image-storage";
import {
  HOME_OFFER_COLS,
  HOME_OFFER_COLS_LEGACY,
  isMissingColumnError,
  isMissingTableError,
  mapHomeOffer,
  normalizeOfferLink,
  sanitizeOfferImageUrl,
  serializeOfferPages,
  type HomeOfferRow,
  type HomeOfferWriteBody,
} from "@/lib/server/home-offer-types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string): number | null {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: raw } = await context.params;
    const id = parseId(raw);
    if (!id) return jsonError(400, "Invalid offer id");

    const body = (await request.json().catch(() => ({}))) as HomeOfferWriteBody;
    const supabase = getSupabaseAdmin();
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) {
      payload.title = String(body.title).trim() || "Offer";
    }
    if (body.linkUrl !== undefined || body.link_url !== undefined) {
      payload.link_url = normalizeOfferLink(
        String(body.linkUrl ?? body.link_url ?? ""),
      );
    }
    if (body.active !== undefined) {
      payload.active = Number(body.active) ? 1 : 0;
    }
    if (body.sortOrder !== undefined || body.sort_order !== undefined) {
      payload.sort_order = Number(body.sortOrder ?? body.sort_order) || 0;
    }
    if (body.showOnPages !== undefined || body.show_on_pages !== undefined) {
      payload.show_on_pages = serializeOfferPages(
        body.showOnPages ?? body.show_on_pages,
      );
    }

    const dataUrl = body.imageDataUrl || body.image_data_url;
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
      try {
        const saved = await saveCardImage({
          username: `offer-${id}`,
          kind: "offer-banner",
          dataUrl,
        });
        payload.image_url = saved.url;
      } catch (uploadErr) {
        return jsonError(
          500,
          uploadErr instanceof Error
            ? uploadErr.message
            : "Failed to upload offer image",
        );
      }
    } else if (body.imageUrl !== undefined || body.image_url !== undefined) {
      const raw = String(body.imageUrl ?? body.image_url ?? "").trim();
      if (raw && !/^data:/i.test(raw)) {
        payload.image_url = sanitizeOfferImageUrl(raw);
      }
    }

    if (Object.keys(payload).length <= 1) {
      return jsonError(400, "No fields to update");
    }

    let data: HomeOfferRow | null = null;
    let { data: updated, error } = await supabase
      .from("home_offers")
      .update(payload)
      .eq("offer_id", id)
      .select(HOME_OFFER_COLS)
      .maybeSingle();
    data = (updated as HomeOfferRow | null) ?? null;

    if (error && isMissingColumnError(error.message)) {
      const legacyPayload = { ...payload };
      delete legacyPayload.title;
      delete legacyPayload.sort_order;
      delete legacyPayload.show_on_pages;
      const legacy = await supabase
        .from("home_offers")
        .update(legacyPayload)
        .eq("offer_id", id)
        .select(HOME_OFFER_COLS_LEGACY)
        .maybeSingle();
      error = legacy.error;
      data = (legacy.data as HomeOfferRow | null) ?? null;
    }

    if (error) {
      if (isMissingTableError(error.message)) {
        return jsonError(
          400,
          "home_offers table missing — run frontend/sql/home-offers-table.sql",
        );
      }
      return jsonError(500, "Failed to update offer", error.message);
    }
    if (!data) return jsonError(404, "Offer not found");

    return jsonOk(mapHomeOffer(data));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: raw } = await context.params;
    const id = parseId(raw);
    if (!id) return jsonError(400, "Invalid offer id");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("home_offers")
      .delete()
      .eq("offer_id", id);

    if (error) {
      if (isMissingTableError(error.message)) {
        return jsonError(
          400,
          "home_offers table missing — run frontend/sql/home-offers-table.sql",
        );
      }
      return jsonError(500, "Failed to delete offer", error.message);
    }

    return jsonOk({ deleted: true, id });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
