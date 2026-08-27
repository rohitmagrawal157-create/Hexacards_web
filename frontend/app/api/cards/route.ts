import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  CARD_COLS,
  mapCard,
  slugifyCardName,
  type CardCreateBody,
  type CardRow,
} from "@/lib/server/card-types";

async function resolveUserId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  body: CardCreateBody,
): Promise<number | null> {
  const explicit = Number(body.userId ?? body.user_id);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;

  const phone = String(body.ownerPhone ?? body.mobileNumber ?? body.mobile ?? "")
    .replace(/\D/g, "")
    .slice(-10);
  if (!phone) return null;

  const { data } = await supabase
    .from("users")
    .select("user_id")
    .eq("mobile", phone)
    .maybeSingle();
  return data?.user_id != null ? Number(data.user_id) : null;
}

function buildCardPayload(
  body: CardCreateBody,
  forCreate: boolean,
  resolvedUserId?: number | null,
) {
  const cardName = String(body.cardName ?? body.card_name ?? "").trim();
  const unic =
    String(body.unicCardName ?? body.unic_card_name ?? "").trim() ||
    (cardName ? slugifyCardName(cardName) : "");
  const userId = Number(resolvedUserId ?? body.userId ?? body.user_id);

  if (forCreate) {
    if (!unic) return { error: "unic_card_name is required" as const };
    if (!Number.isInteger(userId) || userId <= 0) {
      return {
        error:
          "user_id is required — pass userId or ownerPhone of an existing user" as const,
      };
    }
  }

  const payload: Record<string, unknown> = {};

  if (
    forCreate ||
    body.unicCardName !== undefined ||
    body.unic_card_name !== undefined
  ) {
    if (unic) payload.unic_card_name = unic;
  }
  if (forCreate || body.cardName !== undefined || body.card_name !== undefined) {
    payload.card_name = cardName;
  }
  if (body.jobName !== undefined || body.job_name !== undefined) {
    payload.job_name = String(body.jobName ?? body.job_name ?? "").trim();
  }
  if (body.businessName !== undefined || body.business_name !== undefined) {
    payload.business_name = String(
      body.businessName ?? body.business_name ?? "",
    ).trim();
  }
  if (
    forCreate ||
    body.userId !== undefined ||
    body.user_id !== undefined ||
    resolvedUserId
  ) {
    if (Number.isInteger(userId) && userId > 0) payload.user_id = userId;
  }
  if (body.logo !== undefined) payload.logo = body.logo || null;
  if (body.bgImg !== undefined || body.bg_img !== undefined) {
    payload.bg_img = body.bgImg ?? body.bg_img ?? null;
  }
  if (body.bgUrl !== undefined || body.bg_url !== undefined) {
    payload.bg_url = body.bgUrl ?? body.bg_url ?? null;
  }
  if (body.themeId !== undefined || body.theme_id !== undefined) {
    payload.theme_id = Number(body.themeId ?? body.theme_id) || 1;
  }
  if (body.mobile !== undefined) {
    payload.mobile = String(body.mobile ?? "").trim();
  }
  if (body.email !== undefined) {
    payload.email = body.email ? String(body.email).trim() : null;
  }
  if (body.website !== undefined) {
    payload.website = body.website ? String(body.website).trim() : null;
  }
  if (body.code !== undefined) {
    payload.code = String(body.code || "91").trim() || "91";
  }
  if (body.whatsapp !== undefined) {
    payload.whatsapp = body.whatsapp ? String(body.whatsapp).trim() : null;
  }
  if (body.stateId !== undefined || body.state_id !== undefined) {
    const sid = body.stateId ?? body.state_id;
    payload.state_id = sid == null ? null : Number(sid);
  }
  if (body.cityId !== undefined || body.city_id !== undefined) {
    const cid = body.cityId ?? body.city_id;
    payload.city_id = cid == null ? null : Number(cid);
  }
  if (body.address !== undefined) payload.address = body.address || null;
  if (body.about !== undefined) payload.about = body.about || null;
  if (body.facebookUrl !== undefined || body.facebook_url !== undefined) {
    payload.facebook_url = body.facebookUrl ?? body.facebook_url ?? null;
  }
  if (body.instagramUrl !== undefined || body.instagram_url !== undefined) {
    payload.instagram_url = body.instagramUrl ?? body.instagram_url ?? null;
  }
  if (body.linkedinUrl !== undefined || body.linkedin_url !== undefined) {
    payload.linkedin_url = body.linkedinUrl ?? body.linkedin_url ?? null;
  }
  if (body.twitterUrl !== undefined || body.twitter_url !== undefined) {
    payload.twitter_url = body.twitterUrl ?? body.twitter_url ?? null;
  }
  if (body.youtubeUrl !== undefined || body.youtube_url !== undefined) {
    payload.youtube_url = body.youtubeUrl ?? body.youtube_url ?? null;
  }
  if (body.googleUrl !== undefined || body.google_url !== undefined) {
    payload.google_url = body.googleUrl ?? body.google_url ?? null;
  }
  if (body.aboutCompany !== undefined || body.about_company !== undefined) {
    payload.about_company = body.aboutCompany ?? body.about_company ?? null;
  }
  if (body.services !== undefined) payload.services = body.services || null;
  if (body.brochure !== undefined) payload.brochure = body.brochure || null;
  if (body.startDate !== undefined || body.start_date !== undefined) {
    payload.start_date = body.startDate ?? body.start_date ?? null;
  }
  if (body.endDate !== undefined || body.end_date !== undefined) {
    payload.end_date = body.endDate ?? body.end_date ?? null;
  }
  if (body.status !== undefined) {
    payload.status = Number(body.status) ? 1 : 0;
  }

  return { payload };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const slug = searchParams.get("slug")?.trim().toLowerCase();

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("cards")
      .select(CARD_COLS)
      .order("card_id", { ascending: true });

    if (userId) {
      const id = Number(userId);
      if (!Number.isInteger(id) || id <= 0) {
        return jsonError(400, "user_id must be a positive integer");
      }
      query = query.eq("user_id", id);
    }
    if (slug) query = query.eq("unic_card_name", slug);

    const { data, error } = await query;
    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "cards table missing — run frontend/sql/cards-table.sql in Supabase",
        );
      }
      return jsonError(500, "Failed to load cards", error.message);
    }

    return jsonOk((data as CardRow[] | null ?? []).map(mapCard));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CardCreateBody;
    const supabase = getSupabaseAdmin();
    const resolvedUserId = await resolveUserId(supabase, body);
    const built = buildCardPayload(body, true, resolvedUserId);
    if ("error" in built && built.error) return jsonError(400, built.error);

    const { data, error } = await supabase
      .from("cards")
      .insert(built.payload)
      .select(CARD_COLS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return jsonError(409, "unic_card_name already exists");
      }
      if (error.code === "23503") {
        return jsonError(400, "Invalid user_id, state_id, or city_id");
      }
      return jsonError(500, "Failed to create card", error.message);
    }

    return jsonOk(mapCard(data as CardRow), 201);
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
