import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { saveCardImage } from "@/lib/server/card-image-storage";
import {
  DEFAULT_HOME_OFFER,
  HOME_OFFER_COLS,
  HOME_OFFER_COLS_LEGACY,
  isMissingColumnError,
  isMissingTableError,
  mapHomeOffer,
  normalizeOfferLink,
  offerMatchesPathname,
  pickOfferForPathname,
  sanitizeOfferImageUrl,
  serializeOfferPages,
  type HomeOfferRow,
  type HomeOfferWriteBody,
} from "@/lib/server/home-offer-types";

export const runtime = "nodejs";

type Supabase = ReturnType<typeof getSupabaseAdmin>;

async function listOfferRows(
  supabase: Supabase,
  activeOnly: boolean,
): Promise<HomeOfferRow[]> {
  let query = supabase
    .from("home_offers")
    .select(HOME_OFFER_COLS)
    .order("sort_order", { ascending: true })
    .order("offer_id", { ascending: true });

  if (activeOnly) query = query.eq("active", 1);

  let { data, error } = await query;
  if (error && isMissingColumnError(error.message)) {
    let legacy = supabase
      .from("home_offers")
      .select(HOME_OFFER_COLS_LEGACY)
      .order("offer_id", { ascending: true });
    if (activeOnly) legacy = legacy.eq("active", 1);
    ({ data, error } = await legacy);
  }
  if (error) throw error;
  return (data as HomeOfferRow[] | null) ?? [];
}

async function uploadOfferImage(dataUrl: string, offerId: number) {
  return saveCardImage({
    username: `offer-${offerId}`,
    kind: "offer-banner",
    dataUrl,
  });
}

function buildPayload(body: HomeOfferWriteBody, forCreate: boolean) {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (forCreate || body.title !== undefined) {
    payload.title = String(body.title ?? "Offer").trim() || "Offer";
  }
  if (body.linkUrl !== undefined || body.link_url !== undefined || forCreate) {
    payload.link_url = normalizeOfferLink(
      String(body.linkUrl ?? body.link_url ?? "/products"),
    );
  }
  if (body.active !== undefined || forCreate) {
    payload.active =
      body.active === undefined ? 1 : Number(body.active) ? 1 : 0;
  }
  if (body.sortOrder !== undefined || body.sort_order !== undefined) {
    payload.sort_order = Number(body.sortOrder ?? body.sort_order) || 0;
  }
  if (
    forCreate ||
    body.showOnPages !== undefined ||
    body.show_on_pages !== undefined
  ) {
    payload.show_on_pages = serializeOfferPages(
      body.showOnPages ?? body.show_on_pages ?? ["home"],
    );
  }
  if (body.imageUrl !== undefined || body.image_url !== undefined) {
    const next = sanitizeOfferImageUrl(
      String(body.imageUrl ?? body.image_url ?? "").trim(),
    );
    // Only persist real URLs/paths — never multi-MB data: URLs
    if (next && !/^data:/i.test(String(body.imageUrl ?? body.image_url ?? ""))) {
      payload.image_url = next;
    }
  }
  if (forCreate && !payload.image_url) {
    payload.image_url = DEFAULT_HOME_OFFER.imageUrl;
  }

  return payload;
}

/**
 * GET /api/offers
 * - default: all offers (admin list)
 * - ?active=1: active only
 * - ?page=home|products|…: first active offer for that page (dialog)
 * - ?primary=1: first active offer (legacy; prefers home)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly =
      searchParams.get("active") === "1" ||
      searchParams.get("active") === "true";
    const primary =
      searchParams.get("primary") === "1" ||
      searchParams.get("primary") === "true";
    const page = (searchParams.get("page") || "").trim();

    const supabase = getSupabaseAdmin();
    const rows = await listOfferRows(
      supabase,
      activeOnly || primary || Boolean(page),
    );
    const offers = rows.map(mapHomeOffer);

    if (page) {
      const match = pickOfferForPathname(offers, page);
      return jsonOk(match ?? { ...DEFAULT_HOME_OFFER, active: false });
    }

    if (primary) {
      const match = pickOfferForPathname(offers, "/") ?? offers[0];
      return jsonOk(match ?? { ...DEFAULT_HOME_OFFER, active: false });
    }

    return jsonOk(offers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    if (isMissingTableError(message)) {
      const { searchParams } = new URL(request.url);
      const page = (searchParams.get("page") || "").trim();
      const primary =
        searchParams.get("primary") === "1" ||
        searchParams.get("primary") === "true";
      if (page || primary) {
        const defaultMatch = offerMatchesPathname(DEFAULT_HOME_OFFER, page || "/");
        return jsonOk(
          defaultMatch
            ? DEFAULT_HOME_OFFER
            : { ...DEFAULT_HOME_OFFER, active: false },
        );
      }
      return jsonOk([DEFAULT_HOME_OFFER]);
    }
    return jsonError(500, "Failed to load offers", message);
  }
}

/**
 * POST /api/offers — create a new image → link banner
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as HomeOfferWriteBody;
    const supabase = getSupabaseAdmin();
    const payload = buildPayload(body, true);

    let { data, error } = await supabase
      .from("home_offers")
      .insert(payload)
      .select(HOME_OFFER_COLS)
      .single();

    if (error && isMissingColumnError(error.message)) {
      const legacyPayload = { ...payload };
      delete legacyPayload.title;
      delete legacyPayload.sort_order;
      delete legacyPayload.show_on_pages;
      ({ data, error } = await supabase
        .from("home_offers")
        .insert(legacyPayload)
        .select(HOME_OFFER_COLS_LEGACY)
        .single());
    }

    if (error) {
      if (isMissingTableError(error.message)) {
        return jsonError(
          400,
          "home_offers table missing — run frontend/sql/home-offers-table.sql",
        );
      }
      return jsonError(500, "Failed to create offer", error.message);
    }

    let offer = mapHomeOffer(data as HomeOfferRow);
    const dataUrl = body.imageDataUrl || body.image_data_url;
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
      try {
        const saved = await uploadOfferImage(dataUrl, offer.id);
        const updated = await supabase
          .from("home_offers")
          .update({
            image_url: saved.url,
            updated_at: new Date().toISOString(),
          })
          .eq("offer_id", offer.id)
          .select(HOME_OFFER_COLS)
          .single();
        if (!updated.error && updated.data) {
          offer = mapHomeOffer(updated.data as HomeOfferRow);
        } else {
          offer = { ...offer, imageUrl: saved.url };
        }
      } catch (uploadErr) {
        return jsonError(
          500,
          uploadErr instanceof Error
            ? uploadErr.message
            : "Failed to upload offer image",
        );
      }
    }

    return jsonOk(offer, 201);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Server error";
    console.error("[api/offers POST]", message);
    return jsonError(500, message);
  }
}
