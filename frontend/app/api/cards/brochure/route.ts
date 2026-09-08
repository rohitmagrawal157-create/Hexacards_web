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
import {
  clearCardBrochureFile,
  saveCardBrochure,
} from "@/lib/server/card-brochure-storage";
import { sanitizeCardUsername } from "@/lib/server/card-image-storage";
import {
  applyLinksToCard,
  fetchLinksForCard,
  upsertCardLinks,
} from "@/lib/server/card-links-db";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function updateCardBrochure(
  match: { cardId?: number | null; username?: string },
  filename: string,
) {
  const supabase = getSupabaseAdmin();
  const payload = {
    brochure: filename,
    update_time: new Date().toISOString(),
  };

  let query = supabase.from("cards").update(payload);
  if (match.cardId && match.cardId > 0) {
    query = query.eq("card_id", match.cardId);
  } else if (match.username) {
    query = query.eq("unic_card_name", match.username);
  } else {
    return null;
  }

  let { data, error } = await query.select(CARD_COLS).maybeSingle();
  if (error && isExtraMobilesColumnMissingError(error.message)) {
    let retry = supabase.from("cards").update(payload);
    if (match.cardId && match.cardId > 0) {
      retry = retry.eq("card_id", match.cardId);
    } else if (match.username) {
      retry = retry.eq("unic_card_name", match.username);
    }
    ({ data, error } = await retry.select(CARD_COLS_NO_EXTRA).maybeSingle());
  }
  if (error && isAccentColumnMissingError(error.message)) {
    let retry = supabase.from("cards").update(payload);
    if (match.cardId && match.cardId > 0) {
      retry = retry.eq("card_id", match.cardId);
    } else if (match.username) {
      retry = retry.eq("unic_card_name", match.username);
    }
    ({ data, error } = await retry.select(CARD_COLS_LEGACY).maybeSingle());
  }

  if (error) {
    console.warn("[brochure] DB update:", error.message);
    return null;
  }
  if (!data) return null;

  let card = mapCard(data as CardRow);
  try {
    await upsertCardLinks(supabase, card.cardId, { brochure: filename });
    const links = await fetchLinksForCard(supabase, card.cardId);
    card = applyLinksToCard(card, links);
  } catch (err) {
    console.warn(
      "[brochure] links upsert:",
      err instanceof Error ? err.message : err,
    );
  }
  return card;
}

/**
 * POST /api/cards/brochure
 * multipart: file, username|slug, cardId?
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const username = String(
      form.get("username") ?? form.get("slug") ?? "",
    ).trim();
    const idRaw = form.get("cardId") ?? form.get("card_id");
    let cardId: number | null = null;
    if (idRaw != null && String(idRaw).trim()) {
      const n = Number(idRaw);
      if (Number.isInteger(n) && n > 0) cardId = n;
    }

    const file = form.get("file");
    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
      return jsonError(400, "Brochure file is required");
    }
    if (!username) return jsonError(400, "username (card slug) is required");

    const f = file as File;
    const contentType = f.type || "application/pdf";
    if (
      contentType &&
      !ALLOWED_MIME.has(contentType) &&
      !/\.(pdf|png|jpe?g|webp|docx?)$/i.test(f.name)
    ) {
      return jsonError(400, "Use PDF, DOC, DOCX, or image files only");
    }

    const buffer = Buffer.from(await f.arrayBuffer());
    const safeUser = sanitizeCardUsername(username);
    const saved = await saveCardBrochure({
      username: safeUser,
      buffer,
      fileName: f.name || "brochure.pdf",
      contentType,
    });

    let card =
      (await updateCardBrochure({ cardId, username: safeUser }, saved.filename)) ||
      (cardId
        ? await updateCardBrochure({ username: safeUser }, saved.filename)
        : null);

    return jsonOk({
      filename: saved.filename,
      url: saved.url,
      displayName: f.name,
      mime: contentType,
      size: buffer.length,
      cardId: card?.cardId ?? cardId,
      brochure: saved.filename,
    });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Failed to upload brochure",
    );
  }
}

/** DELETE /api/cards/brochure?username=&cardId=&filename= */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = String(
      searchParams.get("username") ?? searchParams.get("slug") ?? "",
    ).trim();
    const cardIdRaw = searchParams.get("cardId") ?? searchParams.get("card_id");
    const cardId =
      cardIdRaw && Number.isInteger(Number(cardIdRaw)) && Number(cardIdRaw) > 0
        ? Number(cardIdRaw)
        : null;
    const filename = String(searchParams.get("filename") ?? "").trim();

    if (!username && !cardId) {
      return jsonError(400, "username or cardId is required");
    }

    if (filename) await clearCardBrochureFile(filename);

    const supabase = getSupabaseAdmin();
    const payload = {
      brochure: null as string | null,
      update_time: new Date().toISOString(),
    };

    if (cardId) {
      await supabase.from("cards").update(payload).eq("card_id", cardId);
      try {
        await upsertCardLinks(supabase, cardId, { brochure: "" });
      } catch {
        // ignore
      }
    } else if (username) {
      await supabase
        .from("cards")
        .update(payload)
        .eq("unic_card_name", sanitizeCardUsername(username));
    }

    return jsonOk({ cleared: true });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Failed to clear brochure",
    );
  }
}
