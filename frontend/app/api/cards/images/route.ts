import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  CARD_COLS,
  CARD_COLS_LEGACY,
  CARD_COLS_NO_EXTRA,
  isAccentColumnMissingError,
  isExtraMobilesColumnMissingError,
  mapCard,
  type CardRow,
} from "@/lib/server/card-types";
import { findActiveCardRowBySlug } from "@/lib/server/card-by-slug";
import {
  cardImageDbFields,
  saveCardImage,
  sanitizeCardUsername,
  type CardImageKind,
} from "@/lib/server/card-image-storage";

export const runtime = "nodejs";

function parseKind(raw: string | null): CardImageKind | null {
  const k = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (k === "profile" || k === "logo" || k === "avatar") return "profile";
  if (k === "background" || k === "cover" || k === "bg") return "background";
  return null;
}

async function updateCardImageFields(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  match: { cardId?: number | null; slug?: string },
  payload: Record<string, unknown>,
): Promise<ReturnType<typeof mapCard> | null> {
  const run = async (
    cols: string,
    filter: { col: string; val: string | number },
  ) => {
    let { data, error } = await supabase
      .from("cards")
      .update(payload)
      .eq(filter.col, filter.val)
      .select(cols)
      .maybeSingle();
    if (error && isExtraMobilesColumnMissingError(error.message)) {
      ({ data, error } = await supabase
        .from("cards")
        .update(payload)
        .eq(filter.col, filter.val)
        .select(CARD_COLS_NO_EXTRA)
        .maybeSingle());
    }
    if (error && isAccentColumnMissingError(error.message)) {
      ({ data, error } = await supabase
        .from("cards")
        .update(payload)
        .eq(filter.col, filter.val)
        .select(CARD_COLS_LEGACY)
        .maybeSingle());
    }
    if (error) {
      console.warn("[card-images] DB update:", error.message);
      return null;
    }
    return data ? mapCard(data as unknown as CardRow) : null;
  };

  if (match.cardId && match.cardId > 0) {
    const byId = await run(CARD_COLS, { col: "card_id", val: match.cardId });
    if (byId) return byId;
  }

  const slug = String(match.slug ?? "").trim().toLowerCase();
  if (!slug) return null;

  // Resolve mixed-case legacy unic_card_name, then update by card_id
  const { row } = await findActiveCardRowBySlug(supabase, slug);
  if (row?.card_id != null) {
    return run(CARD_COLS, { col: "card_id", val: Number(row.card_id) });
  }

  return run(CARD_COLS, { col: "unic_card_name", val: slug });
}

/**
 * POST /api/cards/images
 * Body (multipart): file, slug|username, kind=profile|background, cardId?
 * Body (JSON): { dataUrl, slug|username, kind, cardId? }
 *
 * Saves as {username}-profile.jpg or {username}-background.jpg (overwrite).
 * Updates cards.logo or cards.bg_img/bg_url when the card exists.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let username = "";
    let kind: CardImageKind | null = null;
    let cardId: number | null = null;
    let dataUrl: string | undefined;
    let buffer: Buffer | undefined;
    let fileContentType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      username = String(
        form.get("username") ?? form.get("slug") ?? "",
      ).trim();
      kind = parseKind(String(form.get("kind") ?? ""));
      const idRaw = form.get("cardId") ?? form.get("card_id");
      if (idRaw != null && String(idRaw).trim()) {
        const n = Number(idRaw);
        if (Number.isInteger(n) && n > 0) cardId = n;
      }
      const file = form.get("file");
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const f = file as File;
        buffer = Buffer.from(await f.arrayBuffer());
        fileContentType = f.type || "image/jpeg";
      }
      const du = form.get("dataUrl") ?? form.get("data_url");
      if (typeof du === "string" && du.startsWith("data:")) dataUrl = du;
    } else {
      const body = (await request.json().catch(() => ({}))) as {
        username?: string;
        slug?: string;
        unicCardName?: string;
        kind?: string;
        cardId?: number;
        card_id?: number;
        dataUrl?: string;
        data_url?: string;
      };
      username = String(
        body.username ?? body.slug ?? body.unicCardName ?? "",
      ).trim();
      kind = parseKind(body.kind ?? null);
      const id = body.cardId ?? body.card_id;
      if (id != null && Number.isInteger(Number(id)) && Number(id) > 0) {
        cardId = Number(id);
      }
      dataUrl = body.dataUrl || body.data_url;
    }

    const safeUser = sanitizeCardUsername(username);
    if (!safeUser) {
      return jsonError(400, "slug / username is required");
    }
    if (!kind) {
      return jsonError(400, "kind must be profile or background");
    }
    if (!buffer && !dataUrl) {
      return jsonError(400, "file or dataUrl is required");
    }

    const saved = await saveCardImage({
      username: safeUser,
      kind,
      buffer,
      dataUrl,
      contentType: fileContentType,
    });

    const dbFields = cardImageDbFields(kind, saved.filename);
    const supabase = getSupabaseAdmin();
    const payload = {
      ...dbFields,
      update_time: new Date().toISOString(),
    };

    const card = await updateCardImageFields(
      supabase,
      { cardId, slug: safeUser },
      payload,
    );

    return jsonOk({
      kind,
      username: safeUser,
      filename: saved.filename,
      path: saved.path,
      url: saved.url,
      cardId: card?.cardId ?? cardId,
      logo: card?.logo ?? (kind === "profile" ? saved.filename : undefined),
      bgImg:
        card?.bgImg ?? (kind === "background" ? saved.filename : undefined),
      bgUrl:
        card?.bgUrl ?? (kind === "background" ? saved.filename : undefined),
      dbUpdated: Boolean(card),
    });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Failed to save card image",
    );
  }
}
