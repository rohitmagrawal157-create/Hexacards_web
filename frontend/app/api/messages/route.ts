import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  mapMessage,
  type MessageRow,
  type MessageWriteBody,
} from "@/lib/server/message-types";

async function resolveUserIdByPhone(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  phone: string,
): Promise<number | null> {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (!digits) return null;
  const { data } = await supabase
    .from("users")
    .select("user_id")
    .eq("mobile", digits)
    .maybeSingle();
  return data?.user_id != null ? Number(data.user_id) : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerPhone = searchParams.get("ownerPhone");
    const userId = searchParams.get("userId");
    const unreadOnly = searchParams.get("unread") === "true";

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (userId && /^\d+$/.test(userId)) {
      query = query.eq("user_id", Number(userId));
    } else if (ownerPhone) {
      const digits = ownerPhone.replace(/\D/g, "").slice(-10);
      if (digits) query = query.eq("owner_phone", digits);
    }

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
    const phone = String(body.phone ?? "")
      .replace(/\D/g, "")
      .slice(-10);
    const ownerPhone = String(body.ownerPhone ?? body.owner_phone ?? "")
      .replace(/\D/g, "")
      .slice(-10);

    if (!name) return jsonError(400, "name is required");
    if (!email) return jsonError(400, "email is required");
    if (!message) return jsonError(400, "message is required");
    if (!ownerPhone) {
      return jsonError(400, "ownerPhone is required (card owner)");
    }

    const supabase = getSupabaseAdmin();
    const explicitUserId = Number(body.userId ?? body.user_id);
    const userId =
      Number.isInteger(explicitUserId) && explicitUserId > 0
        ? explicitUserId
        : await resolveUserIdByPhone(supabase, ownerPhone);

    const messageCode =
      String(body.messageCode ?? "").trim() ||
      `MSG-${Date.now().toString().slice(-8)}`;

    const cardIdRaw = body.cardId ?? body.card_id;
    const cardId =
      cardIdRaw == null || cardIdRaw === undefined
        ? null
        : Number(cardIdRaw) || null;

    const cardSlugRaw = String(body.cardSlug ?? body.card_slug ?? "").trim();

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
      card_slug: cardSlugRaw || null,
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
