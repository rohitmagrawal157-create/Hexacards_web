import type { OrderCardDesignData } from "@/lib/order-card";
import { clampLogoLayout, resolveOrderLiveUrl } from "@/lib/order-card";
import { compressCardLogoDataUrl } from "@/lib/order-logo-store";
import { getOrderCardProfile } from "@/lib/order-card-profile";
import { apiFetch } from "@/lib/api-config";
import { normalizeIndianPhone } from "@/lib/auth";
import {
  fetchPaidOrdersForPhone,
  getOrdersForPhone,
  isAdminOfflineOrder,
  isOrderDashboardHidden,
  isOrderPaymentPaid,
  type HexaOrder,
} from "@/lib/orders";
import type { CardDto } from "@/lib/server/card-types";
import { buildOwnerDisplayCardUrl, buildPublicCardUrl } from "@/lib/site-url";
import {
  nextAvailableSlug,
  slugifyForCardLink,
} from "@/lib/card-slug-unique";

export type SavedCardDesign = {
  title?: string;
  subTitle?: string;
  moreDetails?: string;
  cardBody?: "black" | "white";
  cardMode?: "gold" | "silver" | "customize";
  cardColor?: string;
  accentColor?: string;
  logoUrl?: string | null;
  backLogo?: { size: number; x: number; y: number };
  hasLogo?: boolean;
};

export type UserDashboardCard = {
  orderId: string;
  productTitle: string;
  productId?: string;
  name: string;
  subtitle: string;
  slug: string;
  publicUrl: string;
  publicPath: string;
  status: HexaOrder["status"];
  createdAt: string;
  accentColor: string;
  isLatest: boolean;
  /** true for NFC / business cards that have an editable digital profile */
  isEditable: boolean;
  /** Super Admin Add user / offline card — show Offline chip, not Paid */
  isOffline: boolean;
};


/** Products with an editable digital profile (NFC, PVC, Digital + QR). */
export const DIGITAL_PROFILE_PRODUCT_IDS = new Set([
  "nfc-business-card",
  "pvc-card",
  "digital-profile-qr",
  "metal-card",
]);

/** Physical / link products shown on dashboard without a digital profile editor. */
export const PHYSICAL_DASHBOARD_PRODUCT_IDS = new Set([
  "google-standee",
  "instagram-standee",
  "youtube-standee",
  "review-stand",
  "google-stand",
  "instagram-card",
  "youtube-card",
  "google-review-card",
  "google-reviews",
  "social-media-card",
  "review-keychain-qr",
]);

const PHYSICAL_PRODUCT_TITLE_KEYWORDS = [
  "standee",
  "standy",
  "instagram card",
  "youtube card",
  "google review card",
  "social media card",
  "keychain qr",
  "review stand",
  "wooden card",
];

function titleMatchesPhysicalProduct(title: string): boolean {
  const t = title.toLowerCase();
  for (const kw of PHYSICAL_PRODUCT_TITLE_KEYWORDS) {
    if (t.includes(kw)) return true;
  }
  return false;
}

function titleMatchesDigitalProfileProduct(title: string): boolean {
  const t = title.toLowerCase();
  if (titleMatchesPhysicalProduct(t)) return false;
  return (
    t.includes("nfc") ||
    t.includes("business card") ||
    t.includes("hexa card") ||
    t.includes("metal card") ||
    t.includes("hexa nfc") ||
    t.includes("digital profile") ||
    t.includes("digital qr")
  );
}

function titleMatchesDashboardProduct(title: string): boolean {
  return (
    titleMatchesPhysicalProduct(title) ||
    titleMatchesDigitalProfileProduct(title)
  );
}

/** Orders that get an editable digital profile + public slug (NFC / Digital QR). */
export function isEditableCardOrder(
  order: Pick<HexaOrder, "productId" | "productTitle">,
): boolean {
  if (order.productId) {
    return DIGITAL_PROFILE_PRODUCT_IDS.has(order.productId);
  }
  return titleMatchesDigitalProfileProduct(order.productTitle);
}

/** All purchasable products that should appear on the user dashboard My Cards tab. */
export function isDashboardProductOrder(
  order: Pick<HexaOrder, "productId" | "productTitle" | "cardId" | "cardSlug">,
): boolean {
  if (order.productId) {
    return (
      DIGITAL_PROFILE_PRODUCT_IDS.has(order.productId) ||
      PHYSICAL_DASHBOARD_PRODUCT_IDS.has(order.productId)
    );
  }
  if (titleMatchesDashboardProduct(order.productTitle)) return true;
  // Legacy paid rows with blank product_title but a linked digital card
  if (
    (order.cardId && order.cardId > 0) ||
    String(order.cardSlug ?? "").trim()
  ) {
    return true;
  }
  return false;
}

/** @deprecated alias — use isEditableCardOrder for profile/slug logic */
export function isCardProductOrder(order: HexaOrder): boolean {
  return isEditableCardOrder(order);
}

const STANDEE_IDS = new Set([
  "google-standee",
  "instagram-standee",
  "youtube-standee",
  "review-stand",
  "google-stand",
]);

const SOCIAL_CARD_IDS = new Set([
  "instagram-card",
  "youtube-card",
  "google-review-card",
  "google-reviews",
  "social-media-card",
  "review-keychain-qr",
]);

/** Returns the product image src and alt for a dashboard card tile. */
export function orderCardImage(
  productTitle: string,
  productId?: string,
): { src: string; alt: string } {
  if (productId) {
    if (productId === "digital-profile-qr") {
      return {
        src: "/New_Website_IMG/hexa_Web_img-02.jpg",
        alt: "Digital Profile + QR",
      };
    }
    if (STANDEE_IDS.has(productId)) {
      return { src: "/Images/Products/reviewStandy.jpeg", alt: "Standee" };
    }
    if (SOCIAL_CARD_IDS.has(productId)) {
      return { src: "/Images/Products/googleReview.jpeg", alt: "Social Media Card" };
    }
    return { src: "/Images/Products/digitalCard.jpeg", alt: "Hexa NFC card" };
  }
  // Fallback for older orders without productId
  const title = productTitle.toLowerCase();
  if (title.includes("digital profile") || title.includes("digital qr")) {
    return {
      src: "/New_Website_IMG/hexa_Web_img-02.jpg",
      alt: "Digital Profile + QR",
    };
  }
  if (title.includes("standee") || title.includes("standy") || title.includes("review stand")) {
    return { src: "/Images/Products/reviewStandy.jpeg", alt: "Standee" };
  }
  if (
    title.includes("instagram card") ||
    title.includes("youtube card") ||
    title.includes("google review card") ||
    title.includes("social media card") ||
    title.includes("keychain qr")
  ) {
    return { src: "/Images/Products/googleReview.jpeg", alt: "Social Media Card" };
  }
  return { src: "/Images/Products/digitalCard.jpeg", alt: "Hexa NFC card" };
}

export function savedDesignToCardDesign(
  design: SavedCardDesign | null,
  customerName: string,
  _phone: string,
  logoSrc?: string,
): OrderCardDesignData | undefined {
  if (!design && !logoSrc) return undefined;

  const cardBody = design?.cardBody ?? "black";
  const finish =
    cardBody === "black"
      ? design?.cardMode === "silver"
        ? "silver"
        : "gold"
      : "gold";

  const accent =
    design?.accentColor ?? (finish === "silver" ? "#9CA0A4" : "#C9982C");

  return {
    cardBody,
    finish,
    cardColor: design?.cardColor ?? (cardBody === "black" ? "#141414" : "#FFFFFF"),
    accentColor: accent,
    lockedAccentColor: accent,
    name: design?.title?.trim() || customerName,
    subtitle: design?.subTitle?.trim() || "",
    extraLine: design?.moreDetails?.trim() || undefined,
    logoSrc: logoSrc || design?.logoUrl || undefined,
    logoLayout: clampLogoLayout(design?.backLogo),
  };
}

export function orderToDashboardCard(
  order: HexaOrder,
  isLatest: boolean,
): UserDashboardCard {
  const editable = isEditableCardOrder(order);
  const savedProfile = editable ? getOrderCardProfile(order.id) : null;
  const name =
    savedProfile?.contact.cardName?.trim() ||
    order.customerName?.trim() ||
    order.cardDesign?.name?.trim() ||
    order.businessName?.trim() ||
    "Your Name";
  const subtitle =
    savedProfile?.contact.title?.trim() ||
    order.jobTitle?.trim() ||
    order.cardDesign?.subtitle?.trim() ||
    (order.businessName?.trim() &&
    order.businessName.trim() !== order.customerName?.trim()
      ? order.businessName.trim()
      : "") ||
    (order.reviewLink
      ? order.reviewLink.replace(/^https?:\/\//, "").replace(/\/$/, "")
      : "") ||
    order.productTitle;
  const { slug } = editable
    ? resolveOrderLiveUrl(order)
    : { slug: order.id };
  // Owner-facing URL — never localhost (rewrites local checkout leftovers)
  const publicUrl = editable ? buildOwnerDisplayCardUrl(slug) : "";

  return {
    orderId: order.id,
    productTitle: order.productTitle,
    productId: order.productId,
    name,
    subtitle,
    slug,
    publicUrl,
    publicPath: editable ? `/${slug}` : "#",
    status: order.status,
    createdAt: order.createdAt,
    accentColor:
      order.cardDesign?.lockedAccentColor ||
      order.cardDesign?.accentColor ||
      "#BC7C10",
    isLatest,
    isEditable: editable,
    isOffline: isAdminOfflineOrder(order),
  };
}

export function getUserDashboardCards(phone: string): UserDashboardCard[] {
  return getUserDashboardCardsFromOrders(getOrdersForPhone(phone));
}

/**
 * One purchase / one admin add-user → one dashboard row.
 * Prefer real paid orders over synthetic `card-*` stubs.
 * Match by cardId, stored slug, and resolved live slug (name-based).
 */
export function dedupeDashboardOrders(orders: HexaOrder[]): HexaOrder[] {
  const paid = orders
    .filter(isOrderPaymentPaid)
    .filter((o) => !isOrderDashboardHidden(o))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  type Ranked = { order: HexaOrder; synthetic: boolean };
  const winners = new Map<string, Ranked>();

  function isBetter(next: HexaOrder, existing: HexaOrder): boolean {
    const nextSynthetic = String(next.id).startsWith("card-");
    const existingSynthetic = String(existing.id).startsWith("card-");
    if (existingSynthetic && !nextSynthetic) return true;
    if (!existingSynthetic && nextSynthetic) return false;
    // Prefer row that already has cardId / slug linked
    const nextLinked =
      (next.cardId && next.cardId > 0 ? 1 : 0) +
      (String(next.cardSlug ?? "").trim() ? 1 : 0);
    const existingLinked =
      (existing.cardId && existing.cardId > 0 ? 1 : 0) +
      (String(existing.cardSlug ?? "").trim() ? 1 : 0);
    if (nextLinked !== existingLinked) return nextLinked > existingLinked;
    return (
      new Date(next.createdAt).getTime() >
      new Date(existing.createdAt).getTime()
    );
  }

  function consider(key: string, order: HexaOrder) {
    if (!key) return;
    const synthetic = String(order.id).startsWith("card-");
    const existing = winners.get(key);
    if (!existing) {
      winners.set(key, { order, synthetic });
      return;
    }
    if (isBetter(order, existing.order)) {
      winners.set(key, { order, synthetic });
    }
  }

  for (const order of paid) {
    const storedSlug = String(order.cardSlug ?? "").trim().toLowerCase();
    let resolvedSlug = storedSlug;
    if (isEditableCardOrder(order)) {
      try {
        resolvedSlug =
          resolveOrderLiveUrl(order).slug.trim().toLowerCase() || storedSlug;
      } catch {
        // keep stored
      }
    }

    if (order.cardId && order.cardId > 0) {
      consider(`card:${order.cardId}`, order);
    }
    if (storedSlug) consider(`slug:${storedSlug}`, order);
    if (resolvedSlug && resolvedSlug !== storedSlug) {
      consider(`slug:${resolvedSlug}`, order);
    }

    if (order.orderId && order.orderId > 0) {
      consider(`order:${order.orderId}`, order);
    } else {
      consider(`id:${order.id}`, order);
    }
  }

  // Collapse: any two keys pointing at different objects that share card/slug/person
  // already resolved via consider(); emit unique winners by identity.
  const unique = new Map<string, HexaOrder>();
  for (const { order } of winners.values()) {
    const storedSlug = String(order.cardSlug ?? "").trim().toLowerCase();
    let resolvedSlug = storedSlug;
    if (isEditableCardOrder(order)) {
      try {
        resolvedSlug =
          resolveOrderLiveUrl(order).slug.trim().toLowerCase() || storedSlug;
      } catch {
        // ignore
      }
    }
    const id =
      (order.cardId && order.cardId > 0 && `c:${order.cardId}`) ||
      (resolvedSlug && `s:${resolvedSlug}`) ||
      (order.orderId != null && order.orderId > 0 && `o:${order.orderId}`) ||
      `id:${order.id}`;
    const existing = unique.get(id);
    if (!existing || isBetter(order, existing)) unique.set(id, order);
  }

  return [...unique.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Oldest tile keeps the base link; later same-name tiles get base2, base3…
 * Fixes orphan paid orders with empty card_slug that otherwise fall back to
 * the same name-based URL as an existing card (e.g. two /rohit-agrawal).
 */
function assignUniquePublicSlugs(orders: HexaOrder[]): HexaOrder[] {
  const sorted = [...orders].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id));
  });

  const taken = new Set<string>();
  const byId = new Map<string, HexaOrder>();

  for (const order of sorted) {
    if (!isEditableCardOrder(order)) {
      byId.set(order.id, order);
      continue;
    }

    const stored = String(order.cardSlug ?? "").trim().toLowerCase();
    const fromUrl = (() => {
      try {
        return resolveOrderLiveUrl(order).slug.trim().toLowerCase();
      } catch {
        return "";
      }
    })();
    const fromName = slugifyForCardLink(
      order.customerName || order.businessName || "hexa-card",
    );
    const preferred = stored || fromUrl || fromName || "hexa-card";
    const next = nextAvailableSlug(preferred, taken);
    taken.add(next);

    if (next === stored && order.cardUrl) {
      byId.set(order.id, order);
      continue;
    }

    byId.set(order.id, {
      ...order,
      cardSlug: next,
      cardUrl: buildPublicCardUrl(next, "share"),
      cardDesign: order.cardDesign
        ? {
            ...order.cardDesign,
            liveUrl: buildPublicCardUrl(next, "canonical"),
          }
        : order.cardDesign,
    });
  }

  // Preserve original newest-first relative order from caller
  return orders.map((o) => byId.get(o.id) ?? o);
}

export function getUserDashboardCardsFromOrders(
  orders: HexaOrder[],
): UserDashboardCard[] {
  const deduped = dedupeDashboardOrders(orders).filter(isDashboardProductOrder);
  const uniqueSlugs = assignUniquePublicSlugs(deduped);

  // One tile per card_id (or slug) — blocks admin-create order+card duplicates
  const byKey = new Map<string, HexaOrder>();
  for (const order of uniqueSlugs) {
    const slug = String(order.cardSlug ?? "").trim().toLowerCase();
    const key =
      order.cardId && order.cardId > 0
        ? `c:${order.cardId}`
        : slug
          ? `s:${slug}`
          : `id:${order.id}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, order);
      continue;
    }
    const prevSynthetic = String(prev.id).startsWith("card-");
    const nextSynthetic = String(order.id).startsWith("card-");
    if (prevSynthetic && !nextSynthetic) byKey.set(key, order);
  }

  return [...byKey.values()]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .map((order, index) => orderToDashboardCard(order, index === 0));
}

/** Active DB cards → paid HexaOrder stubs (orphan gap-fill only). */
function cardDtoToPaidOrder(card: CardDto, fallbackPhone: string): HexaOrder {
  const phone =
    normalizeIndianPhone(card.mobile) ||
    normalizeIndianPhone(fallbackPhone) ||
    "";
  const slug = String(card.unicCardName || "").trim().toLowerCase();
  const createdAt = card.dateTime || card.updateTime || new Date().toISOString();

  return {
    id: `card-${card.cardId}`,
    createdAt,
    status: "placed",
    paymentStatus: "paid",
    paymentMethod: "offline",
    ownerPhone: phone,
    customerName: card.cardName?.trim() || "Your Name",
    phone,
    email: card.email?.trim() || "",
    address: card.address?.trim() || "",
    city: "",
    postalCode: "",
    country: "IN",
    stateId: card.stateId,
    cityId: card.cityId,
    packTitle: "Digital Card",
    qty: 1,
    subtotal: 0,
    discount: 0,
    total: 0,
    productTitle: "Digital Profile + QR",
    productId: "digital-profile-qr",
    userId: card.userId,
    cardId: card.cardId,
    cardSlug: slug || undefined,
    cardUrl: slug ? buildPublicCardUrl(slug, "share") : undefined,
    businessName: card.businessName?.trim() || undefined,
    jobTitle: card.jobName?.trim() || undefined,
  };
}

async function resolveUserIdForPhone(phone: string): Promise<number | null> {
  const digits = normalizeIndianPhone(phone);
  if (!digits) return null;
  const res = await apiFetch<Array<{ userId: number }>>(
    `/api/users?mobile=${encodeURIComponent(digits)}`,
  );
  if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) return null;
  const id = Number(res.data[0]?.userId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function fetchCardsForUserId(userId: number): Promise<CardDto[]> {
  if (!Number.isInteger(userId) || userId <= 0) return [];
  const res = await apiFetch<CardDto[]>(`/api/cards?user_id=${userId}`);
  if (!res.ok || !Array.isArray(res.data)) return [];
  return res.data.filter(
    (c) => c.cardId > 0 && Number(c.userId) === userId,
  );
}

/** Cards whose primary mobile matches the login phone (legacy / shared-phone rows). */
async function fetchCardsForMobile(phone: string): Promise<CardDto[]> {
  const digits = normalizeIndianPhone(phone);
  if (!digits) return [];
  const res = await apiFetch<CardDto[]>(
    `/api/cards?mobile=${encodeURIComponent(digits)}`,
  );
  if (!res.ok || !Array.isArray(res.data)) return [];
  return res.data.filter((c) => {
    if (!(c.cardId > 0)) return false;
    const cardPhone = normalizeIndianPhone(c.mobile);
    return cardPhone === digits;
  });
}

/**
 * Cards visible on this login: by users.user_id OR by cards.mobile = login phone.
 * Many legacy rows (e.g. Aniket + Shoeb on one phone) share a mobile but may have
 * mismatched / null user_id after imports — phone match keeps them visible.
 */
async function fetchCardsForAccount(
  phone: string,
  userId: number | null,
): Promise<CardDto[]> {
  const [byUser, byMobile] = await Promise.all([
    userId && userId > 0 ? fetchCardsForUserId(userId) : Promise.resolve([]),
    fetchCardsForMobile(phone),
  ]);
  const byId = new Map<number, CardDto>();
  for (const card of [...byUser, ...byMobile]) {
    if (!byId.has(card.cardId)) byId.set(card.cardId, card);
  }
  return [...byId.values()];
}

function paymentPreferenceRank(order: HexaOrder): number {
  // Higher = better for My Cards chip / product metadata
  if (isAdminOfflineOrder(order)) return 1;
  if (isOrderPaymentPaid(order)) return 3;
  return 2;
}

function preferRicherPaidOrder(
  a: HexaOrder | undefined,
  b: HexaOrder | undefined,
): HexaOrder | undefined {
  if (!a) return b;
  if (!b) return a;
  const ra = paymentPreferenceRank(a);
  const rb = paymentPreferenceRank(b);
  if (rb !== ra) return rb > ra ? b : a;
  return new Date(b.createdAt).getTime() > new Date(a.createdAt).getTime()
    ? b
    : a;
}

/**
 * Match a `cards` row to its paid order: card_id, slug (incl. base2), or
 * same phone + same person name. Prefers real checkout (razorpay/online)
 * over Super Admin offline so the tile shows Paid + business profile.
 */
function findLinkedPaidOrderForCard(
  card: CardDto,
  paidOrders: HexaOrder[],
  paidByCardId: Map<number, HexaOrder>,
  paidBySlug: Map<string, HexaOrder>,
): HexaOrder | undefined {
  const slug = String(card.unicCardName || "")
    .trim()
    .toLowerCase();
  const slugBase = slug.replace(/\d+$/, "");
  const cardPhone = normalizeIndianPhone(card.mobile);
  const cardNameKey = slugifyForCardLink(card.cardName || "");
  const cardNameBase = cardNameKey.replace(/\d+$/, "");

  let best =
    preferRicherPaidOrder(
      card.cardId > 0 ? paidByCardId.get(card.cardId) : undefined,
      slug ? paidBySlug.get(slug) : undefined,
    ) ?? undefined;

  if (slugBase && slugBase !== slug) {
    best = preferRicherPaidOrder(best, paidBySlug.get(slugBase));
  }

  for (const order of paidOrders) {
    if (order.cardId && order.cardId === card.cardId) {
      best = preferRicherPaidOrder(best, order);
      continue;
    }
    const oSlug = String(order.cardSlug ?? "")
      .trim()
      .toLowerCase();
    const oSlugBase = oSlug.replace(/\d+$/, "");
    if (
      oSlug &&
      (oSlug === slug ||
        (slugBase && (oSlug === slugBase || oSlugBase === slugBase)))
    ) {
      best = preferRicherPaidOrder(best, order);
      continue;
    }
    const oPhone =
      normalizeIndianPhone(order.ownerPhone) ||
      normalizeIndianPhone(order.phone);
    const oName = slugifyForCardLink(order.customerName || "");
    const oNameBase = oName.replace(/\d+$/, "");
    if (
      cardPhone &&
      oPhone === cardPhone &&
      cardNameBase &&
      (oName === cardNameKey || oNameBase === cardNameBase)
    ) {
      best = preferRicherPaidOrder(best, order);
    }
  }

  return best;
}

/**
 * Dashboard list for one logged-in account.
 *
 * Digital My Cards:
 *   1) All `cards` rows for this user_id OR this login phone (one tile per card_id)
 *   2) Paid digital orders for this phone only when not already covered by (1)
 * Physical products still come from paid phone-owned orders.
 *
 * Orders are ALWAYS scoped by phone only (never phone ∪ userId) so a stale
 * auth.userId cannot pull another person's checkout rows (Shoeb → Punit).
 */
export async function fetchUserDashboardOrders(
  phone: string,
  userId?: number | null,
): Promise<HexaOrder[]> {
  const phoneDigits = normalizeIndianPhone(phone);
  let uid = userId && userId > 0 ? userId : null;
  if (!uid && phoneDigits) {
    uid = await resolveUserIdForPhone(phoneDigits);
  }

  const paidOrders = phoneDigits
    ? (await fetchPaidOrdersForPhone(phone, null)).filter((o) => {
        const owner =
          normalizeIndianPhone(o.ownerPhone) || normalizeIndianPhone(o.phone);
        return owner === phoneDigits;
      })
    : [];

  const userCards = phoneDigits
    ? await fetchCardsForAccount(phoneDigits, uid)
    : uid
      ? await fetchCardsForUserId(uid)
      : [];
  const coveredCardIds = new Set(userCards.map((c) => c.cardId));
  const coveredSlugs = new Set(
    userCards
      .map((c) => String(c.unicCardName || "").trim().toLowerCase())
      .filter(Boolean),
  );

  const paidByCardId = new Map<number, HexaOrder>();
  const paidBySlug = new Map<string, HexaOrder>();
  for (const order of paidOrders) {
    if (order.cardId && order.cardId > 0) {
      paidByCardId.set(
        order.cardId,
        preferRicherPaidOrder(paidByCardId.get(order.cardId), order)!,
      );
    }
    const slug = String(order.cardSlug ?? "").trim().toLowerCase();
    if (slug) {
      paidBySlug.set(
        slug,
        preferRicherPaidOrder(paidBySlug.get(slug), order)!,
      );
    }
  }

  const fromCards: HexaOrder[] = [];
  const linkedOrderIds = new Set<string>();

  for (const card of userCards) {
    const slug = String(card.unicCardName || "").trim().toLowerCase();
    const linked = findLinkedPaidOrderForCard(
      card,
      paidOrders,
      paidByCardId,
      paidBySlug,
    );

    if (linked) {
      linkedOrderIds.add(linked.id);
      // Checkout paid wins for chip; card row wins for profile fields
      const checkoutPaid = !isAdminOfflineOrder(linked);
      fromCards.push({
        ...linked,
        cardId: card.cardId,
        cardSlug: slug || linked.cardSlug,
        cardUrl: slug
          ? buildPublicCardUrl(slug, "share")
          : linked.cardUrl,
        userId: uid ?? linked.userId ?? card.userId,
        customerName:
          card.cardName?.trim() || linked.customerName || "Your Name",
        businessName:
          card.businessName?.trim() || linked.businessName || undefined,
        jobTitle: card.jobName?.trim() || linked.jobTitle || undefined,
        // Keep checkout product identity for Paid chip art (NFC / business card)
        productTitle: checkoutPaid
          ? linked.productTitle || "Hexa NFC Business Card"
          : linked.productTitle || "Digital Profile + QR",
        productId: checkoutPaid
          ? linked.productId ||
            (String(linked.productTitle || "")
              .toLowerCase()
              .includes("nfc")
              ? "nfc-business-card"
              : linked.productId) ||
            "nfc-business-card"
          : linked.productId || "digital-profile-qr",
      });
    } else {
      fromCards.push(cardDtoToPaidOrder(card, phoneDigits || phone));
    }
  }

  // Paid products not already shown via a cards row (standees + true orphan digitals).
  const extras: HexaOrder[] = [];
  const fromCardNameKeys = new Set(
    fromCards.map((o) =>
      slugifyForCardLink(o.customerName || o.businessName || ""),
    ),
  );
  const fromCardBases = new Set(
    [...coveredSlugs].map((s) => s.replace(/\d+$/, "")).filter(Boolean),
  );

  for (const order of paidOrders) {
    if (linkedOrderIds.has(order.id)) continue;
    if (!isDashboardProductOrder(order)) continue;
    if (order.cardId && order.cardId > 0 && coveredCardIds.has(order.cardId)) {
      continue;
    }
    const slug = String(order.cardSlug ?? "").trim().toLowerCase();
    if (slug && coveredSlugs.has(slug)) continue;
    if (
      slug &&
      fromCards.some((o) => String(o.cardSlug ?? "").toLowerCase() === slug)
    ) {
      continue;
    }
    if (
      order.cardId &&
      order.cardId > 0 &&
      fromCards.some((o) => o.cardId === order.cardId)
    ) {
      continue;
    }

    if (isEditableCardOrder(order) && !(order.cardId && order.cardId > 0)) {
      const nameKey = slugifyForCardLink(
        order.customerName || order.businessName || "",
      );
      const nameBase = nameKey.replace(/\d+$/, "");
      if (nameKey && fromCardNameKeys.has(nameKey)) continue;
      if (nameBase && fromCardBases.has(nameBase)) continue;
      if (slug) {
        const slugBase = slug.replace(/\d+$/, "");
        if (slugBase && fromCardBases.has(slugBase)) continue;
      }
    }

    extras.push(order);
  }

  return assignUniquePublicSlugs(
    dedupeDashboardOrders([...fromCards, ...extras]),
  );
}

/** @deprecated use initOrderCardProfile — each order keeps its own profile */
export function syncCardProfileFromOrder(_order: HexaOrder) {
  // No-op: profiles are stored per order id (see order-card-profile.ts)
}

export async function blobUrlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function resolveLogoForOrder(
  design: SavedCardDesign | null,
): Promise<string | undefined> {
  const logo = design?.logoUrl;
  if (!logo) return undefined;

  let raw = logo;
  if (logo.startsWith("blob:")) {
    try {
      raw = await blobUrlToDataUrl(logo);
    } catch {
      return undefined;
    }
  }

  return compressCardLogoDataUrl(raw);
}
