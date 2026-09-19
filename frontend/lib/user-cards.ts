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
    order.businessName?.trim() ||
    order.cardDesign?.name?.trim() ||
    order.customerName ||
    "Your Name";
  const subtitle =
    savedProfile?.contact.title?.trim() ||
    order.cardDesign?.subtitle?.trim() ||
    order.jobTitle?.trim() ||
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

export function getUserDashboardCardsFromOrders(
  orders: HexaOrder[],
): UserDashboardCard[] {
  return dedupeDashboardOrders(orders)
    .filter(isDashboardProductOrder)
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
  // GET /api/cards?user_id=X  →  SELECT * FROM cards WHERE user_id = X
  const res = await apiFetch<CardDto[]>(`/api/cards?user_id=${userId}`);
  if (!res.ok || !Array.isArray(res.data)) return [];
  return res.data.filter(
    (c) =>
      c.cardId > 0 &&
      Number(c.userId) === userId,
  );
}

/**
 * Dashboard list for one logged-in account.
 *
 * My Cards source of truth: ALL rows in `cards` for this user_id
 *   (same as: SELECT * FROM cards WHERE user_id = :authUserId)
 *
 * Paid checkout orders are still merged so Orders / Total spent stay correct,
 * and physical products without a cards row still appear when paid.
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

  // Checkout / admin orders owned by this phone (metrics + order history)
  const paidOrders = phoneDigits
    ? (await fetchPaidOrdersForPhone(phone, null)).filter((o) => {
        const owner =
          normalizeIndianPhone(o.ownerPhone) || normalizeIndianPhone(o.phone);
        return owner === phoneDigits;
      })
    : [];

  // Every card belonging to this user_id
  const userCards = uid ? await fetchCardsForUserId(uid) : [];

  const paidByCardId = new Map<number, HexaOrder>();
  const paidBySlug = new Map<string, HexaOrder>();
  for (const order of paidOrders) {
    if (order.cardId && order.cardId > 0) {
      paidByCardId.set(order.cardId, order);
    }
    const slug = String(order.cardSlug ?? "").trim().toLowerCase();
    if (slug) paidBySlug.set(slug, order);
  }

  const fromCards: HexaOrder[] = [];
  const coveredOrderKeys = new Set<string>();

  for (const card of userCards) {
    const slug = String(card.unicCardName || "").trim().toLowerCase();
    const linked =
      paidByCardId.get(card.cardId) ||
      (slug ? paidBySlug.get(slug) : undefined);

    if (linked) {
      // Prefer real order row, but keep cardId/slug from cards table
      fromCards.push({
        ...linked,
        cardId: card.cardId,
        cardSlug: slug || linked.cardSlug,
        userId: uid,
        customerName:
          card.cardName?.trim() || linked.customerName || "Your Name",
        businessName: card.businessName?.trim() || linked.businessName,
        jobTitle: card.jobName?.trim() || linked.jobTitle,
      });
      coveredOrderKeys.add(
        linked.orderId && linked.orderId > 0
          ? `id:${linked.orderId}`
          : `code:${linked.id}`,
      );
    } else {
      // Card exists for this user_id with no linked order → still show on My Cards
      fromCards.push(cardDtoToPaidOrder(card, phoneDigits || phone));
    }
  }

  // Keep paid physical / other products that are not already represented by a card
  const extras: HexaOrder[] = [];
  for (const order of paidOrders) {
    const key =
      order.orderId && order.orderId > 0
        ? `id:${order.orderId}`
        : `code:${order.id}`;
    if (coveredOrderKeys.has(key)) continue;
    if (order.cardId && order.cardId > 0) {
      const used = fromCards.some((o) => o.cardId === order.cardId);
      if (used) continue;
    }
    const slug = String(order.cardSlug ?? "").trim().toLowerCase();
    if (
      slug &&
      fromCards.some((o) => String(o.cardSlug ?? "").toLowerCase() === slug)
    ) {
      continue;
    }
    extras.push(order);
  }

  return dedupeDashboardOrders([...fromCards, ...extras]);
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
