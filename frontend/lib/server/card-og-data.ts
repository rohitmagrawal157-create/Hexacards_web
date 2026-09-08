import {
  CARD_COLS,
  CARD_COLS_LEGACY,
  CARD_COLS_NO_EXTRA,
  isAccentColumnMissingError,
  isExtraMobilesColumnMissingError,
  mapCard,
  type CardDto,
  type CardRow,
} from "@/lib/server/card-types";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveCardImageSrc } from "@/lib/card-images";
import { DEFAULT_CARD_AVATAR } from "@/lib/card-profile";
import { isReservedRootSegment } from "@/lib/reserved-routes";
import { getShareSiteOrigin } from "@/lib/site-url";

export const CARD_OG_DESCRIPTION = "This is my digital business card";
export const CARD_OG_FALLBACK_IMAGE = "/Hexacards_Icons.png";

export type CardOgPayload = {
  slug: string;
  name: string;
  description: string;
  pageUrl: string;
  /** Absolute https URL WhatsApp can fetch */
  imageUrl: string;
  /** True when image is the real profile photo (not brand fallback) */
  hasProfilePhoto: boolean;
};

function toAbsoluteUrl(src: string, origin: string): string {
  const trimmed = src.trim();
  if (!trimmed) return `${origin}${CARD_OG_FALLBACK_IMAGE}`;
  if (/^https?:\/\//i.test(trimmed)) {
    // Strip cache-bust query for cleaner OG; WhatsApp is fine either way
    return trimmed;
  }
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
  return `${origin}/${trimmed.replace(/^\/+/, "")}`;
}

export function resolveCardProfileImageUrl(
  logo: string | null | undefined,
  updateTime?: string | null,
  origin = getShareSiteOrigin(),
): { imageUrl: string; hasProfilePhoto: boolean } {
  const resolved = resolveCardImageSrc(
    logo,
    DEFAULT_CARD_AVATAR,
    updateTime,
  );
  const bare = resolved.split("?")[0].toLowerCase();
  if (
    !resolved ||
    resolved.startsWith("data:") ||
    resolved.startsWith("idb:") ||
    bare.endsWith(".svg") ||
    bare.includes("avatar_default")
  ) {
    return {
      imageUrl: toAbsoluteUrl(CARD_OG_FALLBACK_IMAGE, origin),
      hasProfilePhoto: false,
    };
  }
  return {
    imageUrl: toAbsoluteUrl(resolved, origin),
    hasProfilePhoto: true,
  };
}

export async function fetchCardBySlugForOg(
  rawSlug: string,
): Promise<CardDto | null> {
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  if (!slug || isReservedRootSegment(slug)) return null;

  const supabase = getSupabaseAdmin();
  let { data, error } = await supabase
    .from("cards")
    .select(CARD_COLS)
    .eq("unic_card_name", slug)
    .eq("status", 1)
    .maybeSingle();

  if (error && isExtraMobilesColumnMissingError(error.message)) {
    ({ data, error } = await supabase
      .from("cards")
      .select(CARD_COLS_NO_EXTRA)
      .eq("unic_card_name", slug)
      .eq("status", 1)
      .maybeSingle());
  }

  if (error && isAccentColumnMissingError(error.message)) {
    ({ data, error } = await supabase
      .from("cards")
      .select(CARD_COLS_LEGACY)
      .eq("unic_card_name", slug)
      .eq("status", 1)
      .maybeSingle());
  }

  if (error || !data) return null;
  return mapCard(data as CardRow);
}

export async function getCardOgPayload(
  rawSlug: string,
): Promise<CardOgPayload | null> {
  try {
    const card = await fetchCardBySlugForOg(rawSlug);
    if (!card) return null;

    const origin = getShareSiteOrigin();
    const slug = card.unicCardName || rawSlug.trim().toLowerCase();
    const name =
      card.cardName?.trim() ||
      card.businessName?.trim() ||
      "HexaCards";
    const { imageUrl, hasProfilePhoto } = resolveCardProfileImageUrl(
      card.logo,
      card.updateTime,
      origin,
    );

    return {
      slug,
      name,
      description: CARD_OG_DESCRIPTION,
      pageUrl: `${origin}/${slug}`,
      imageUrl,
      hasProfilePhoto,
    };
  } catch (err) {
    console.error("[card-og] failed to load card:", err);
    return null;
  }
}
