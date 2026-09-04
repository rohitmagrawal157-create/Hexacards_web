import {
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
  defaultCardProfile,
  normalizeCoverImage,
  normalizeLogoImage,
  type HexaCardProfile,
} from "@/lib/card-profile";
import { upsertOrderCardInDb } from "@/lib/cards-api";
import {
  getOrderById,
  isOrderPaymentPaid,
  updateOrder,
  type HexaOrder,
} from "@/lib/orders";

const ORDER_PROFILES_KEY = "hexaOrderCardProfiles";

function profileFromOrder(
  order: HexaOrder,
  base: HexaCardProfile,
): HexaCardProfile {
  const design = order.cardDesign;
  return {
    ...base,
    contact: {
      ...base.contact,
      cardName:
        design?.name?.trim() || order.customerName || base.contact.cardName,
      title:
        design?.subtitle?.trim() ||
        order.jobTitle?.trim() ||
        base.contact.title,
      mobile: order.phone || base.contact.mobile,
      whatsapp: order.phone || base.contact.whatsapp,
      email: order.email?.trim() || base.contact.email,
      city: order.city?.trim() || base.contact.city,
      address: order.address?.trim() || base.contact.address,
      businessName:
        order.businessName?.trim() ||
        order.companyName?.trim() ||
        base.contact.businessName,
      state: order.state?.trim() || base.contact.state,
    },
    appearance: {
      ...base.appearance,
      logoImage:
        design?.logoSrc &&
        !design.logoSrc.startsWith("data:") &&
        !design.logoSrc.startsWith("idb:")
          ? normalizeLogoImage(design.logoSrc)
          : base.appearance.logoImage,
    },
  };
}

function readAll(): Record<string, HexaCardProfile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ORDER_PROFILES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, HexaCardProfile>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function isOversizedDataUrl(src?: string | null, maxChars = 80_000) {
  return Boolean(src?.startsWith("data:image/") && src.length > maxChars);
}

function compactProfile(profile: HexaCardProfile): HexaCardProfile {
  const appearance = profile.appearance;
  if (
    !isOversizedDataUrl(appearance?.logoImage) &&
    !isOversizedDataUrl(appearance?.coverImage) &&
    !isOversizedDataUrl(appearance?.shareImage)
  ) {
    return profile;
  }

  return {
    ...profile,
    appearance: {
      ...appearance,
      logoImage: isOversizedDataUrl(appearance.logoImage)
        ? DEFAULT_CARD_AVATAR
        : appearance.logoImage,
      coverImage: isOversizedDataUrl(appearance.coverImage)
        ? DEFAULT_CARD_BANNER
        : appearance.coverImage,
      shareImage: isOversizedDataUrl(appearance.shareImage)
        ? null
        : appearance.shareImage,
    },
  };
}

function writeAll(profiles: Record<string, HexaCardProfile>, notify = true) {
  const compact: Record<string, HexaCardProfile> = {};
  for (const [id, profile] of Object.entries(profiles)) {
    compact[id] = compactProfile(profile);
  }

  try {
    localStorage.setItem(ORDER_PROFILES_KEY, JSON.stringify(compact));
  } catch {
    try {
      localStorage.removeItem(ORDER_PROFILES_KEY);
      const ids = Object.keys(compact).slice(-15);
      const trimmed: Record<string, HexaCardProfile> = {};
      for (const id of ids) trimmed[id] = compact[id];
      localStorage.setItem(ORDER_PROFILES_KEY, JSON.stringify(trimmed));
    } catch {
      // Order placement should still succeed even if profiles cannot persist.
    }
  }
  if (notify) {
    window.dispatchEvent(new Event("hexa-order-profiles-change"));
  }
}

/** Read a saved card profile for a specific order id. */
export function getOrderCardProfile(
  orderId: string,
): HexaCardProfile | null {
  if (!orderId) return null;
  const all = readAll();
  const profile = all[orderId];
  if (!profile || typeof profile !== "object") return null;
  return {
    ...profile,
    appearance: {
      ...profile.appearance,
      coverImage: normalizeCoverImage(
        profile.appearance?.coverImage,
        profile.updatedAt,
      ),
      logoImage: normalizeLogoImage(
        profile.appearance?.logoImage,
        profile.updatedAt,
      ),
    },
  };
}

/** Remove cached profile when Super Admin deletes the card. */
export function removeOrderCardProfile(orderId: string) {
  if (!orderId || typeof window === "undefined") return;
  const all = readAll();
  if (!all[orderId]) return;
  delete all[orderId];
  writeAll(all);
}

/** Cache profile locally without events or order sync (safe during page load). */
export function cacheOrderCardProfile(
  orderId: string,
  profile: HexaCardProfile,
): HexaCardProfile {
  const next: HexaCardProfile = {
    ...profile,
    updatedAt: profile.updatedAt || new Date().toISOString(),
  };
  const all = readAll();
  all[orderId] = next;
  writeAll(all, false);
  return next;
}

/** Local-only save (sync). Prefer persistOrderCardProfile for DB. */
export function saveOrderCardProfile(
  orderId: string,
  profile: HexaCardProfile,
  loc?: { countryId?: number | null; stateId?: number | null; cityId?: number | null },
): HexaCardProfile {
  const next: HexaCardProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  const all = readAll();
  all[orderId] = next;
  writeAll(all);
  syncOrderCardDesignFromProfile(orderId, next, loc);
  return next;
}

/**
 * Save profile to localStorage + Supabase `cards`, and link `orders.card_id`.
 */
export async function persistOrderCardProfile(
  order: HexaOrder,
  profile: HexaCardProfile,
  loc?: { countryId?: number | null; stateId?: number | null; cityId?: number | null },
): Promise<HexaCardProfile> {
  const next = saveOrderCardProfile(order.id, profile, loc);
  const result = await upsertOrderCardInDb(order, next, loc);
  if (result.error) {
    console.warn("[cards] DB persist warning:", result.error);
  }
  if (result.cardId && order.cardId !== result.cardId) {
    await updateOrder(order.id, { cardId: result.cardId });
  }
  return next;
}

/** Create isolated profile for a new order — does not touch other cards */
export function initOrderCardProfile(order: HexaOrder): HexaCardProfile {
  if (!isOrderPaymentPaid(order)) {
    throw new Error("Card profile is only available after successful payment.");
  }
  const existing = getOrderCardProfile(order.id);
  if (existing) return existing;

  const base = defaultCardProfile(order.customerName, order.phone);
  const profile = profileFromOrder(order, base);
  return saveOrderCardProfile(order.id, profile);
}

/** Init local profile + create/link Supabase card row */
export async function initOrderCardProfileAsync(
  order: HexaOrder,
): Promise<HexaCardProfile> {
  if (!isOrderPaymentPaid(order)) {
    throw new Error("Card profile is only available after successful payment.");
  }
  const profile = initOrderCardProfile(order);
  const result = await upsertOrderCardInDb(order, profile, {
    stateId: order.stateId ?? null,
    cityId: order.cityId ?? null,
  });
  if (result.cardId && order.cardId !== result.cardId) {
    await updateOrder(order.id, { cardId: result.cardId });
  }
  return profile;
}

export function loadOrderCardProfile(
  order: HexaOrder,
  fallbackName?: string,
  fallbackPhone?: string,
): HexaCardProfile {
  const saved = getOrderCardProfile(order.id);
  if (saved) return saved;

  const base = defaultCardProfile(
    fallbackName || order.customerName,
    fallbackPhone || order.phone,
  );
  return profileFromOrder(order, base);
}

/** Keep NFC print fields on the order in sync with profile edits */
function syncOrderCardDesignFromProfile(
  orderId: string,
  profile: HexaCardProfile,
  loc?: { countryId?: number | null; stateId?: number | null; cityId?: number | null },
) {
  const order = getOrderById(orderId);
  if (!order) return;

  void updateOrder(orderId, {
    customerName: profile.contact.cardName.trim() || order.customerName,
    jobTitle: profile.contact.title.trim() || order.jobTitle,
    email: profile.contact.email.trim() || order.email,
    phone: profile.contact.mobile.replace(/\D/g, "").slice(-10) || order.phone,
    city: profile.contact.city.trim() || order.city,
    state: profile.contact.state.trim() || order.state,
    address: profile.contact.address.trim() || order.address,
    businessName:
      profile.contact.businessName.trim() || order.businessName,
    companyName:
      profile.contact.businessName.trim() || order.companyName,
    countryId: loc?.countryId ?? order.countryId ?? null,
    stateId: loc?.stateId ?? order.stateId ?? null,
    cityId: loc?.cityId ?? order.cityId ?? null,
    cardDesign: order.cardDesign
      ? {
          ...order.cardDesign,
          name: profile.contact.cardName.trim() || order.cardDesign.name,
          subtitle: profile.contact.title.trim() || order.cardDesign.subtitle,
        }
      : undefined,
  });
}

/** Ensure every paid card order has a saved profile (one-time per order) */
export function ensureOrderCardProfile(order: HexaOrder): HexaCardProfile | null {
  if (!isOrderPaymentPaid(order)) return null;
  const saved = getOrderCardProfile(order.id);
  if (saved) return saved;
  return initOrderCardProfile(order);
}
