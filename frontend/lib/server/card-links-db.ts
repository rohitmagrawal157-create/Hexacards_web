import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardCreateBody, CardDto } from "@/lib/server/card-types";
import {
  LINK_COLS,
  LINK_TYPE_SORT,
  LINK_TYPES,
  mapLink,
  type CardLinkFields,
  type LinkDto,
  type LinkRow,
  type LinkType,
} from "@/lib/server/link-types";

function trimUrl(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/** Pull link values from a card create/update body (camel or snake). */
export function extractLinksFromBody(
  body: CardCreateBody & {
    telegramUrl?: string | null;
    telegram_url?: string | null;
    snapchatUrl?: string | null;
    snapchat_url?: string | null;
    pinterestUrl?: string | null;
    pinterest_url?: string | null;
    tripadvisorUrl?: string | null;
    tripadvisor_url?: string | null;
    links?: { linkType?: string; link_type?: string; linkUrl?: string; link_url?: string }[];
  },
): Partial<Record<LinkType, string>> {
  const out: Partial<Record<LinkType, string>> = {};

  const setIfPresent = (
    type: LinkType,
    present: boolean,
    value: unknown,
  ) => {
    if (!present) return;
    out[type] = trimUrl(value);
  };

  setIfPresent(
    "website",
    body.website !== undefined,
    body.website,
  );
  setIfPresent(
    "facebook",
    body.facebookUrl !== undefined || body.facebook_url !== undefined,
    body.facebookUrl ?? body.facebook_url,
  );
  setIfPresent(
    "instagram",
    body.instagramUrl !== undefined || body.instagram_url !== undefined,
    body.instagramUrl ?? body.instagram_url,
  );
  setIfPresent(
    "linkedin",
    body.linkedinUrl !== undefined || body.linkedin_url !== undefined,
    body.linkedinUrl ?? body.linkedin_url,
  );
  setIfPresent(
    "twitter",
    body.twitterUrl !== undefined || body.twitter_url !== undefined,
    body.twitterUrl ?? body.twitter_url,
  );
  setIfPresent(
    "youtube",
    body.youtubeUrl !== undefined || body.youtube_url !== undefined,
    body.youtubeUrl ?? body.youtube_url,
  );
  setIfPresent(
    "google_review",
    body.googleUrl !== undefined || body.google_url !== undefined,
    body.googleUrl ?? body.google_url,
  );
  setIfPresent(
    "telegram",
    body.telegramUrl !== undefined || body.telegram_url !== undefined,
    body.telegramUrl ?? body.telegram_url,
  );
  setIfPresent(
    "snapchat",
    body.snapchatUrl !== undefined || body.snapchat_url !== undefined,
    body.snapchatUrl ?? body.snapchat_url,
  );
  setIfPresent(
    "pinterest",
    body.pinterestUrl !== undefined || body.pinterest_url !== undefined,
    body.pinterestUrl ?? body.pinterest_url,
  );
  setIfPresent(
    "tripadvisor",
    body.tripadvisorUrl !== undefined || body.tripadvisor_url !== undefined,
    body.tripadvisorUrl ?? body.tripadvisor_url,
  );
  setIfPresent(
    "brochure",
    body.brochure !== undefined,
    body.brochure,
  );

  if (Array.isArray(body.links)) {
    for (const item of body.links) {
      const type = String(item.linkType ?? item.link_type ?? "").trim();
      if (!(LINK_TYPES as readonly string[]).includes(type)) continue;
      out[type as LinkType] = trimUrl(item.linkUrl ?? item.link_url);
    }
  }

  return out;
}

export function linksToCardFields(links: LinkDto[]): CardLinkFields {
  const byType = new Map(links.map((l) => [l.linkType, l.linkUrl]));
  const get = (t: LinkType) => {
    const v = byType.get(t)?.trim();
    return v ? v : null;
  };

  return {
    website: get("website"),
    facebookUrl: get("facebook"),
    instagramUrl: get("instagram"),
    linkedinUrl: get("linkedin"),
    twitterUrl: get("twitter"),
    youtubeUrl: get("youtube"),
    googleUrl: get("google_review"),
    telegramUrl: get("telegram"),
    snapchatUrl: get("snapchat"),
    pinterestUrl: get("pinterest"),
    tripadvisorUrl: get("tripadvisor"),
    brochure: get("brochure"),
    links,
  };
}

/** Merge links onto a card DTO; keep legacy card columns as fallback. */
export function applyLinksToCard(
  card: CardDto,
  links: LinkDto[],
): CardDto & CardLinkFields {
  const fromLinks = linksToCardFields(links);
  return {
    ...card,
    website: fromLinks.website ?? card.website,
    facebookUrl: fromLinks.facebookUrl ?? card.facebookUrl,
    instagramUrl: fromLinks.instagramUrl ?? card.instagramUrl,
    linkedinUrl: fromLinks.linkedinUrl ?? card.linkedinUrl,
    twitterUrl: fromLinks.twitterUrl ?? card.twitterUrl,
    youtubeUrl: fromLinks.youtubeUrl ?? card.youtubeUrl,
    googleUrl: fromLinks.googleUrl ?? card.googleUrl,
    telegramUrl: fromLinks.telegramUrl ?? null,
    snapchatUrl: fromLinks.snapchatUrl ?? null,
    pinterestUrl: fromLinks.pinterestUrl ?? null,
    tripadvisorUrl: fromLinks.tripadvisorUrl ?? null,
    brochure: fromLinks.brochure ?? card.brochure,
    links: fromLinks.links,
  };
}

export async function fetchLinksForCard(
  supabase: SupabaseClient,
  cardId: number,
): Promise<LinkDto[]> {
  const { data, error } = await supabase
    .from("links")
    .select(LINK_COLS)
    .eq("card_id", cardId)
    .eq("status", 1)
    .order("sort_order", { ascending: true });

  if (error) {
    // Table missing — caller can fall back to cards columns
    if (
      error.message.includes("does not exist") ||
      error.message.includes("schema cache")
    ) {
      return [];
    }
    console.warn("[links] fetch failed:", error.message);
    return [];
  }

  return ((data as LinkRow[] | null) ?? []).map(mapLink);
}

export async function fetchLinksForCards(
  supabase: SupabaseClient,
  cardIds: number[],
): Promise<Map<number, LinkDto[]>> {
  const map = new Map<number, LinkDto[]>();
  if (cardIds.length === 0) return map;

  const { data, error } = await supabase
    .from("links")
    .select(LINK_COLS)
    .in("card_id", cardIds)
    .eq("status", 1)
    .order("sort_order", { ascending: true });

  if (error) {
    if (
      !error.message.includes("does not exist") &&
      !error.message.includes("schema cache")
    ) {
      console.warn("[links] batch fetch failed:", error.message);
    }
    return map;
  }

  for (const row of (data as LinkRow[] | null) ?? []) {
    const id = Number(row.card_id);
    const list = map.get(id) ?? [];
    list.push(mapLink(row));
    map.set(id, list);
  }
  return map;
}

/**
 * Upsert link rows for a card. Empty URL → soft-disable (status 0).
 * Only updates types present in `values`.
 */
export async function upsertCardLinks(
  supabase: SupabaseClient,
  cardId: number,
  values: Partial<Record<LinkType, string>>,
): Promise<LinkDto[]> {
  const entries = Object.entries(values) as [LinkType, string][];
  if (entries.length === 0) {
    return fetchLinksForCard(supabase, cardId);
  }

  const rows = entries.map(([link_type, link_url]) => {
    const url = trimUrl(link_url);
    return {
      card_id: cardId,
      link_type,
      link_url: url,
      link_label: null,
      sort_order: LINK_TYPE_SORT[link_type] ?? 0,
      status: url ? 1 : 0,
      update_time: new Date().toISOString(),
    };
  });

  const { error } = await supabase.from("links").upsert(rows, {
    onConflict: "card_id,link_type",
  });

  if (error) {
    if (
      error.message.includes("does not exist") ||
      error.message.includes("schema cache")
    ) {
      console.warn(
        "[links] table missing — run frontend/sql/links-table.sql",
      );
      return [];
    }
    throw new Error(error.message);
  }

  return fetchLinksForCard(supabase, cardId);
}

/** Strip link fields from a cards-table payload (they live in `links` now). */
export function stripLinkFieldsFromCardPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...payload };
  delete next.website;
  delete next.facebook_url;
  delete next.instagram_url;
  delete next.linkedin_url;
  delete next.twitter_url;
  delete next.youtube_url;
  delete next.google_url;
  delete next.brochure;
  return next;
}
