import { apiFetch } from "@/lib/api-config";
import {
  computeCardEndDateIso,
  toIsoDateOnly,
} from "@/lib/card-validity";
import { getAuthUser, normalizeIndianPhone } from "@/lib/auth";
import {
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
  decodeCardMobileField,
  encodeExtraMobilesField,
  normalizeCardAccent,
  normalizeCardLayout,
  normalizeCoverImage,
  normalizeExtraMobiles,
  normalizeLogoImage,
  type CardLayoutId,
  type HexaCardProfile,
} from "@/lib/card-profile";
import type { CardDto } from "@/lib/server/card-types";
import { updateOrder, isOrderPaymentPaid, type HexaOrder } from "@/lib/orders";
import { resolveOrderLiveUrl } from "@/lib/order-card";
import {
  resolveCardImageSrc,
  toCardImageDbName,
  pickStoredCardCover,
} from "@/lib/card-images";
import { buildPublicCardUrl } from "@/lib/site-url";
import { cleanDbText, isBlankDbValue, pickDbText } from "@/lib/db-text";

const LAYOUT_TO_THEME: Record<CardLayoutId, number> = {
  classic: 1,
  basic: 2,
  modern: 3,
  compact: 4,
  social: 5,
  minimalist: 6,
  bold: 1,
  elegant: 1,
};

const THEME_TO_LAYOUT: Record<number, CardLayoutId> = {
  1: "classic",
  2: "basic",
  3: "modern",
  4: "compact",
  5: "social",
  6: "minimalist",
};

/** Persist file name only in DB — never full paths or data URLs. */
function dbImagePath(src: string | null | undefined): string | null {
  return toCardImageDbName(src);
}

function servicesToDb(services: string[] | undefined): string | null {
  if (!Array.isArray(services) || services.length === 0) return null;
  const lines = services
    .map((s) => cleanDbText(s))
    .filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

function servicesFromDb(raw: string | null | undefined): string[] {
  if (isBlankDbValue(raw)) return [];
  return String(raw)
    .split(/\n|,/)
    .map((s) => cleanDbText(s))
    .filter(Boolean);
}

export function themeIdFromLayout(layout: string | null | undefined): number {
  const id = normalizeCardLayout(layout);
  return LAYOUT_TO_THEME[id] ?? 1;
}

export function layoutFromThemeId(themeId: number | null | undefined): CardLayoutId {
  return THEME_TO_LAYOUT[Number(themeId) || 1] ?? "classic";
}

export function profileToCardBody(
  profile: HexaCardProfile,
  opts: {
    slug: string;
    userId?: number | null;
    ownerPhone?: string;
    stateId?: number | null;
    cityId?: number | null;
  },
) {
  const primaryMobile = normalizeIndianPhone(profile.contact.mobile);
  const extraMobiles = encodeExtraMobilesField(
    profile.contact.extraMobiles,
    primaryMobile,
  );
  const whatsapp =
    normalizeIndianPhone(profile.contact.whatsapp) || primaryMobile;
  const logo = dbImagePath(profile.appearance.logoImage);
  const cover = dbImagePath(profile.appearance.coverImage);
  const accentColor =
    normalizeCardAccent(profile.appearance.accentColor) || "#141414";

  return {
    unicCardName: opts.slug.trim().toLowerCase(),
    cardName: profile.contact.cardName.trim(),
    jobName: profile.contact.title.trim(),
    businessName: profile.contact.businessName.trim(),
    userId: opts.userId ?? undefined,
    ownerPhone: opts.ownerPhone || primaryMobile,
    logo,
    bgImg: cover,
    bgUrl: cover,
    themeId: themeIdFromLayout(profile.appearance.layout),
    accentColor,
    mobile: primaryMobile,
    extraMobiles,
    email: profile.contact.email.trim() || null,
    website: profile.contact.website.trim(),
    code: profile.contact.countryCode?.replace(/\D/g, "") || "91",
    whatsapp: whatsapp || null,
    stateId: opts.stateId ?? null,
    cityId: opts.cityId ?? null,
    address: profile.contact.address.trim() || null,
    about: profile.business.about?.trim() || null,
    aboutCompany: profile.business.about?.trim() || null,
    facebookUrl: profile.social.facebook.trim(),
    instagramUrl: profile.social.instagram.trim(),
    linkedinUrl: profile.social.linkedin.trim(),
    twitterUrl: profile.social.twitter.trim(),
    youtubeUrl: profile.social.youtube.trim(),
    googleUrl: profile.social.googleReview.trim(),
    telegramUrl: profile.social.telegram.trim(),
    snapchatUrl: profile.social.snapchat.trim(),
    pinterestUrl: profile.social.pinterest.trim(),
    tripadvisorUrl: profile.social.tripadvisor.trim(),
    services: servicesToDb(profile.business.services),
    brochure: profile.contact.brochureName
      ? profile.contact.brochureName.trim().slice(0, 500)
      : "",
    status: 1,
  };
}

export function cardDtoToProfile(
  card: CardDto,
  base?: HexaCardProfile | null,
): HexaCardProfile {
  const fallback = base ?? {
    contact: {
      cardName: "",
      title: "",
      businessName: "",
      countryCode: "IN",
      mobile: "",
      extraMobiles: [],
      whatsapp: "",
      email: "",
      website: "",
      state: "",
      city: "",
      address: "",
      brochureName: null,
      brochureDisplayName: null,
      brochureMime: null,
      brochureSize: null,
    },
    social: {
      instagram: "",
      facebook: "",
      linkedin: "",
      twitter: "",
      youtube: "",
      googleReview: "",
      telegram: "",
      snapchat: "",
      pinterest: "",
      tripadvisor: "",
    },
    business: { about: "", services: [] },
    appearance: {
      coverImage: DEFAULT_CARD_BANNER,
      logoImage: DEFAULT_CARD_AVATAR,
      shareImage: null,
      accentColor: "#141414",
      layout: "classic" as CardLayoutId,
    },
    updatedAt: new Date().toISOString(),
  };

  return {
    ...fallback,
    contact: {
      ...fallback.contact,
      cardName: pickDbText(fallback.contact.cardName, card.cardName),
      title: pickDbText(fallback.contact.title, card.jobName),
      businessName: pickDbText(
        fallback.contact.businessName,
        card.businessName,
      ),
      countryCode: card.code === "91" ? "IN" : fallback.contact.countryCode,
      mobile: (() => {
        if (card.mobile?.includes("|")) {
          return (
            decodeCardMobileField(card.mobile).mobile ||
            fallback.contact.mobile
          );
        }
        const cleaned = cleanDbText(card.mobile);
        return (
          normalizeIndianPhone(cleaned) ||
          cleaned ||
          fallback.contact.mobile
        );
      })(),
      extraMobiles: (() => {
        const fromCol = normalizeExtraMobiles(card.extraMobiles).filter(
          (m) => !isBlankDbValue(m),
        );
        if (fromCol.length > 0) return fromCol;
        if (card.mobile?.includes("|")) {
          return decodeCardMobileField(card.mobile).extraMobiles;
        }
        return normalizeExtraMobiles(fallback.contact.extraMobiles);
      })(),
      whatsapp: (() => {
        const fromDb = cleanDbText(card.whatsapp);
        const digits =
          normalizeIndianPhone(fromDb) ||
          normalizeIndianPhone(card.mobile) ||
          (card.mobile?.includes("|")
            ? decodeCardMobileField(card.mobile).mobile
            : "") ||
          normalizeIndianPhone(fallback.contact.whatsapp) ||
          normalizeIndianPhone(fallback.contact.mobile);
        return digits || fallback.contact.whatsapp || "";
      })(),
      email: pickDbText(fallback.contact.email, card.email),
      website: pickDbText(fallback.contact.website, card.website),
      address: pickDbText(fallback.contact.address, card.address),
      // Keep city/state labels from local/order cache (DB only stores IDs)
      state: fallback.contact.state,
      city: fallback.contact.city,
      brochureName: (() => {
        const name = cleanDbText(card.brochure);
        return name || null;
      })(),
      brochureDisplayName: cleanDbText(card.brochure)
        ? fallback.contact.brochureDisplayName
        : null,
      brochureMime: cleanDbText(card.brochure)
        ? fallback.contact.brochureMime
        : null,
      brochureSize: cleanDbText(card.brochure)
        ? fallback.contact.brochureSize
        : null,
    },
    social: {
      ...fallback.social,
      facebook: pickDbText(fallback.social.facebook, card.facebookUrl),
      instagram: pickDbText(fallback.social.instagram, card.instagramUrl),
      linkedin: pickDbText(fallback.social.linkedin, card.linkedinUrl),
      twitter: pickDbText(fallback.social.twitter, card.twitterUrl),
      youtube: pickDbText(fallback.social.youtube, card.youtubeUrl),
      googleReview: pickDbText(fallback.social.googleReview, card.googleUrl),
      telegram: pickDbText(fallback.social.telegram, card.telegramUrl),
      snapchat: pickDbText(fallback.social.snapchat, card.snapchatUrl),
      pinterest: pickDbText(fallback.social.pinterest, card.pinterestUrl),
      tripadvisor: pickDbText(
        fallback.social.tripadvisor,
        card.tripadvisorUrl,
      ),
    },
    business: {
      about: pickDbText(
        fallback.business.about,
        card.about,
        card.aboutCompany,
      ),
      services: (() => {
        const fromDb = servicesFromDb(card.services);
        if (fromDb.length > 0) return fromDb;
        // Literal "NULL" / empty in DB → keep local editor content
        return Array.isArray(fallback.business.services)
          ? fallback.business.services.filter((s) => cleanDbText(s))
          : [];
      })(),
    },
    appearance: {
      ...fallback.appearance,
      logoImage: normalizeLogoImage(
        resolveCardImageSrc(
          card.logo,
          fallback.appearance.logoImage || DEFAULT_CARD_AVATAR,
          card.updateTime,
        ),
        card.updateTime,
      ),
      coverImage: normalizeCoverImage(
        (() => {
          const stored = pickStoredCardCover(card.bgUrl, card.bgImg);
          if (!stored) {
            return fallback.appearance.coverImage || DEFAULT_CARD_BANNER;
          }
          return resolveCardImageSrc(
            stored,
            fallback.appearance.coverImage || DEFAULT_CARD_BANNER,
            card.updateTime,
          );
        })(),
        card.updateTime,
      ),
      layout: layoutFromThemeId(card.themeId),
      accentColor:
        normalizeCardAccent(card.accentColor) ??
        normalizeCardAccent(fallback.appearance.accentColor) ??
        "#141414",
    },
    updatedAt: card.updateTime || new Date().toISOString(),
  };
}

/** Strip literal "NULL" and decode &amp; on any profile (cache or DB). */
export function sanitizeHexaCardProfile(
  profile: HexaCardProfile,
): HexaCardProfile {
  const contact = profile.contact;
  const social = profile.social;
  const business = profile.business;
  return {
    ...profile,
    contact: {
      ...contact,
      cardName: cleanDbText(contact.cardName),
      title: cleanDbText(contact.title),
      businessName: cleanDbText(contact.businessName),
      mobile: cleanDbText(contact.mobile),
      whatsapp:
        cleanDbText(contact.whatsapp) || cleanDbText(contact.mobile),
      email: cleanDbText(contact.email),
      website: cleanDbText(contact.website),
      address: cleanDbText(contact.address),
      state: cleanDbText(contact.state),
      city: cleanDbText(contact.city),
      brochureName: cleanDbText(contact.brochureName) || null,
      brochureDisplayName: cleanDbText(contact.brochureDisplayName) || null,
    },
    social: {
      ...social,
      facebook: cleanDbText(social.facebook),
      instagram: cleanDbText(social.instagram),
      linkedin: cleanDbText(social.linkedin),
      twitter: cleanDbText(social.twitter),
      youtube: cleanDbText(social.youtube),
      googleReview: cleanDbText(social.googleReview),
      telegram: cleanDbText(social.telegram),
      snapchat: cleanDbText(social.snapchat),
      pinterest: cleanDbText(social.pinterest),
      tripadvisor: cleanDbText(social.tripadvisor),
    },
    business: {
      about: cleanDbText(business?.about),
      services: Array.isArray(business?.services)
        ? business.services.map((s) => cleanDbText(s)).filter(Boolean)
        : [],
    },
    appearance: {
      ...profile.appearance,
      logoImage: normalizeLogoImage(
        profile.appearance?.logoImage,
        profile.updatedAt,
      ),
      coverImage: normalizeCoverImage(
        profile.appearance?.coverImage,
        profile.updatedAt,
      ),
    },
  };
}

export async function fetchCardBySlug(
  slug: string,
  opts?: { countView?: boolean },
): Promise<CardDto | null> {
  const s = slug.trim().toLowerCase();
  if (!s) return null;
  const qs = opts?.countView === false ? "?count=0" : "";
  const res = await apiFetch<CardDto>(
    `/api/cards/by-slug/${encodeURIComponent(s)}${qs}`,
  );
  return res.ok && res.data ? res.data : null;
}

export async function fetchCardById(cardId: number): Promise<CardDto | null> {
  if (!Number.isInteger(cardId) || cardId <= 0) return null;
  const res = await apiFetch<CardDto>(`/api/cards/${cardId}`);
  return res.ok && res.data ? res.data : null;
}

/**
 * Create or update the Supabase `cards` row for an order profile,
 * then link `orders.card_id`. Keeps localStorage as cache via callers.
 */
export async function upsertOrderCardInDb(
  order: HexaOrder,
  profile: HexaCardProfile,
  loc?: { stateId?: number | null; cityId?: number | null },
): Promise<{ cardId: number | null; error?: string }> {
  if (!isOrderPaymentPaid(order)) {
    return {
      cardId: null,
      error: "Payment required before creating a digital card",
    };
  }

  const auth = getAuthUser();
  const { slug } = resolveOrderLiveUrl(order);
  const ownerPhone =
    normalizeIndianPhone(order.ownerPhone) ||
    normalizeIndianPhone(order.phone) ||
    normalizeIndianPhone(auth?.phone ?? "") ||
    normalizeIndianPhone(profile.contact.mobile);

  const userId =
    (order.userId && order.userId > 0 ? order.userId : null) ||
    (auth?.userId && auth.userId > 0 ? auth.userId : null);

  const body = {
    ...profileToCardBody(profile, {
      slug: order.cardSlug?.trim() || slug,
      userId,
      ownerPhone,
      stateId: loc?.stateId ?? order.stateId ?? null,
      cityId: loc?.cityId ?? order.cityId ?? null,
    }),
    ...((): { startDate?: string; endDate?: string } => {
      if (order.cardId && order.cardId > 0) return {};
      const startDate = toIsoDateOnly(order.createdAt);
      const endDate = computeCardEndDateIso(startDate, order.productId);
      return endDate ? { startDate, endDate } : {};
    })(),
  };

  let card: CardDto | null = null;
  let error: string | undefined;

  if (order.cardId && order.cardId > 0) {
    const res = await apiFetch<CardDto>(`/api/cards/${order.cardId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (res.ok && res.data) card = res.data;
    else error = res.error || "Failed to update card";
  }

  if (!card) {
    // Try existing by slug (e.g. previous save linked differently)
    const existing = await apiFetch<CardDto[]>(
      `/api/cards?slug=${encodeURIComponent(body.unicCardName)}`,
    );
    const found =
      existing.ok && Array.isArray(existing.data)
        ? existing.data.find(
            (c) => c.unicCardName === body.unicCardName,
          ) ?? existing.data[0]
        : null;

    if (found?.cardId) {
      const res = await apiFetch<CardDto>(`/api/cards/${found.cardId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (res.ok && res.data) card = res.data;
      else error = res.error || "Failed to update card by slug";
    } else {
      const res = await apiFetch<CardDto>("/api/cards", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.ok && res.data) card = res.data;
      else {
        error = res.error || "Failed to create card";
        console.error("[cards] Supabase save failed:", res.error, res.details);
      }
    }
  }

  if (!card) return { cardId: null, error };

  const nextSlug = card.unicCardName;
  const nextUrl = buildPublicCardUrl(nextSlug, "share");
  const needsOrderLink =
    order.cardId !== card.cardId ||
    order.userId !== card.userId ||
    order.cardSlug?.trim().toLowerCase() !== nextSlug.trim().toLowerCase() ||
    (order.cardUrl || "").replace(/\/$/, "") !== nextUrl;

  // Avoid redundant order writes — they fan out hexa-orders-change / localStorage
  // and make every open dashboard/admin tab refetch at once.
  if (needsOrderLink) {
    await updateOrder(order.id, {
      cardId: card.cardId,
      userId: card.userId,
      cardSlug: nextSlug,
      cardUrl: nextUrl,
    });
  }

  return { cardId: card.cardId };
}
