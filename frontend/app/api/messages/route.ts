import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  mapMessage,
  type MessageRow,
  type MessageWriteBody,
} from "@/lib/server/message-types";

function digits10(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  // cards.mobile may be primary|extra1|extra2
  const primary = text.includes("|") ? text.split("|")[0] : text;
  return primary.replace(/\D/g, "").slice(-10);
}

async function resolveUserIdByPhone(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  phone: string,
): Promise<number | null> {
  const digits = digits10(phone);
  if (!digits) return null;
  const { data } = await supabase
    .from("users")
    .select("user_id")
    .eq("mobile", digits)
    .maybeSingle();
  return data?.user_id != null ? Number(data.user_id) : null;
}

async function resolveOwnerFromCard(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  opts: { cardId?: number | null; cardSlug?: string | null },
): Promise<{
  ownerPhone: string;
  userId: number | null;
  cardId: number | null;
  cardSlug: string | null;
}> {
  let cardQuery = supabase
    .from("cards")
    .select("card_id, user_id, mobile, unic_card_name")
    .limit(1);

  if (opts.cardId && Number.isInteger(opts.cardId) && opts.cardId > 0) {
    cardQuery = cardQuery.eq("card_id", opts.cardId);
  } else if (opts.cardSlug?.trim()) {
    cardQuery = cardQuery.eq(
      "unic_card_name",
      opts.cardSlug.trim().toLowerCase(),
    );
  } else {
    return { ownerPhone: "", userId: null, cardId: null, cardSlug: null };
  }

  const { data: card } = await cardQuery.maybeSingle();
  if (!card) {
    return { ownerPhone: "", userId: null, cardId: null, cardSlug: null };
  }

  const cardId = card.card_id != null ? Number(card.card_id) : null;
  const cardSlug =
    String(card.unic_card_name ?? "").trim().toLowerCase() || null;
  const userId = card.user_id != null ? Number(card.user_id) : null;

  // Prefer account login phone (users.mobile) so dashboard inbox matches auth.phone
  if (userId && userId > 0) {
    const { data: user } = await supabase
      .from("users")
      .select("mobile")
      .eq("user_id", userId)
      .maybeSingle();
    const fromUser = digits10(user?.mobile);
    if (fromUser) {
      return { ownerPhone: fromUser, userId, cardId, cardSlug };
    }
  }

  const fromCard = digits10(card.mobile);
  return {
    ownerPhone: fromCard,
    userId: userId && userId > 0 ? userId : null,
    cardId,
    cardSlug,
  };
}

async function cardIdsForOwner(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  opts: { userId?: number | null; ownerPhone?: string },
): Promise<number[]> {
  let userId = opts.userId && opts.userId > 0 ? opts.userId : null;
  if (!userId && opts.ownerPhone) {
    userId = await resolveUserIdByPhone(supabase, opts.ownerPhone);
  }
  if (!userId) return [];

  const { data } = await supabase
    .from("cards")
    .select("card_id")
    .eq("user_id", userId)
    .eq("status", 1);

  return ((data as { card_id: number | string }[] | null) ?? [])
    .map((row) => Number(row.card_id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerPhone = searchParams.get("ownerPhone");
    const userId = searchParams.get("userId");
    const unreadOnly = searchParams.get("unread") === "true";

    const supabase = getSupabaseAdmin();
    const uid = userId && /^\d+$/.test(userId) ? Number(userId) : null;
    const digits = digits10(ownerPhone);

    if ((!uid || uid <= 0) && !digits) {
      return jsonError(400, "ownerPhone or userId is required");
    }

    const ownedCardIds = await cardIdsForOwner(supabase, {
      userId: uid,
      ownerPhone: digits,
    });

    const filters: string[] = [];
    if (uid && uid > 0) filters.push(`user_id.eq.${uid}`);
    if (digits) filters.push(`owner_phone.eq.${digits}`);
    if (ownedCardIds.length > 0) {
      filters.push(`card_id.in.(${ownedCardIds.join(",")})`);
    }

    let query = supabase
      .from("messages")
      .select("*")
      .or(filters.join(","))
      .order("created_at", { ascending: false });

    if (unreadOnly) query = query.eq("is_read", 0);

    const { data, error } = await query;
    if (error) {
      return jsonError(500, "Failed to load messages", error.message);
    }
    return jsonOk(((data as MessageRow[] | null) ?? []).map(mapMessage));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as MessageWriteBody;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();
    const phone = digits10(body.phone);
    let ownerPhone = digits10(body.ownerPhone ?? body.owner_phone);

    if (!name) return jsonError(400, "name is required");
    if (!email) return jsonError(400, "email is required");
    if (!message) return jsonError(400, "message is required");

    const supabase = getSupabaseAdmin();
    const explicitUserId = Number(body.userId ?? body.user_id);
    let userId =
      Number.isInteger(explicitUserId) && explicitUserId > 0
        ? explicitUserId
        : null;

    const cardIdRaw = body.cardId ?? body.card_id;
    let cardId =
      cardIdRaw == null || cardIdRaw === undefined
        ? null
        : Number(cardIdRaw) || null;
    let cardSlug =
      String(body.cardSlug ?? body.card_slug ?? "")
        .trim()
        .toLowerCase() || null;

    // Always prefer account owner from the card row (public visitors may send
    // the card display phone, which can differ from the login phone).
    if (cardId || cardSlug) {
      const fromCard = await resolveOwnerFromCard(supabase, {
        cardId,
        cardSlug,
      });
      if (fromCard.ownerPhone) ownerPhone = fromCard.ownerPhone;
      if (fromCard.userId) userId = fromCard.userId;
      if (fromCard.cardId) cardId = fromCard.cardId;
      if (fromCard.cardSlug) cardSlug = fromCard.cardSlug;
    }

    if (!ownerPhone && userId) {
      const { data: user } = await supabase
        .from("users")
        .select("mobile")
        .eq("user_id", userId)
        .maybeSingle();
      ownerPhone = digits10(user?.mobile);
    }

    if (!ownerPhone) {
      return jsonError(
        400,
        "Could not route message to card owner — missing owner phone",
      );
    }

    if (!userId) {
      userId = await resolveUserIdByPhone(supabase, ownerPhone);
    }

    const messageCode =
      String(body.messageCode ?? "").trim() ||
      `MSG-${Date.now().toString().slice(-8)}`;

    const payload = {
      user_id: userId,
      name,
      email,
      phone,
      website: String(body.website ?? "").trim(),
      message,
      is_read: 0,
      owner_phone: ownerPhone,
      card_id: cardId,
      card_slug: cardSlug,
      message_code: messageCode,
    };

    const { data, error } = await supabase
      .from("messages")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return jsonError(500, "Failed to save message", error.message);
    }
    return jsonOk(mapMessage(data as MessageRow), 201);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
