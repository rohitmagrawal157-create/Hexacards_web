import type { OrderCardDesignData } from "@/lib/order-card";
import { resolveOrderLiveUrl } from "@/lib/order-card";
import { compressCardLogoDataUrl } from "@/lib/order-logo-store";
import { getOrderCardProfile } from "@/lib/order-card-profile";
import { getOrdersForPhone, type HexaOrder } from "@/lib/orders";

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
};


const NON_CARD_PRODUCT_IDS = new Set([
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

const NON_CARD_PRODUCT_TITLE_KEYWORDS = [
  "standee",
  "standy",
  "instagram card",
  "youtube card",
  "google review card",
  "social media card",
  "keychain qr",
  "review stand",
  "pvc card",
  "wooden card",
];

export function isCardProductOrder(order: HexaOrder): boolean {
  // Use productId as the primary source of truth when available
  if (order.productId) {
    return !NON_CARD_PRODUCT_IDS.has(order.productId);
  }
  // Fall back to title matching for older orders
  const title = order.productTitle.toLowerCase();
  for (const kw of NON_CARD_PRODUCT_TITLE_KEYWORDS) {
    if (title.includes(kw)) return false;
  }
  return (
    title.includes("nfc") ||
    title.includes("business card") ||
    title.includes("hexa card") ||
    title.includes("metal card") ||
    title.includes("hexa nfc")
  );
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
      return { src: "/Images/banner.png", alt: "Digital Profile + QR" };
    }
    if (STANDEE_IDS.has(productId)) {
      return { src: "/Images/Products/reviewStandy.jpg", alt: "Standee" };
    }
    if (SOCIAL_CARD_IDS.has(productId)) {
      return { src: "/Images/Products/googleReview.jpg", alt: "Social Media Card" };
    }
    return { src: "/Images/Products/digitalCard.jpg", alt: "Hexa NFC card" };
  }
  // Fallback for older orders without productId
  const title = productTitle.toLowerCase();
  if (title.includes("digital profile") || title.includes("digital qr")) {
    return { src: "/Images/banner.png", alt: "Digital Profile + QR" };
  }
  if (title.includes("standee") || title.includes("standy") || title.includes("review stand")) {
    return { src: "/Images/Products/reviewStandy.jpg", alt: "Standee" };
  }
  if (
    title.includes("instagram card") ||
    title.includes("youtube card") ||
    title.includes("google review card") ||
    title.includes("social media card") ||
    title.includes("keychain qr")
  ) {
    return { src: "/Images/Products/googleReview.jpg", alt: "Social Media Card" };
  }
  return { src: "/Images/Products/digitalCard.jpg", alt: "Hexa NFC card" };
}

export function savedDesignToCardDesign(
  design: SavedCardDesign | null,
  customerName: string,
  phone: string,
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
    extraLine: design?.moreDetails?.trim() || phone || undefined,
    logoSrc: logoSrc || design?.logoUrl || undefined,
    logoLayout: design?.backLogo ?? { size: 86, x: 50, y: 48 },
  };
}

export function orderToDashboardCard(
  order: HexaOrder,
  isLatest: boolean,
): UserDashboardCard {
  const editable = isCardProductOrder(order);
  const savedProfile = editable ? getOrderCardProfile(order.id) : null;
  const name =
    savedProfile?.contact.cardName?.trim() ||
    order.cardDesign?.name?.trim() ||
    order.customerName ||
    "Your Name";
  const subtitle =
    savedProfile?.contact.title?.trim() ||
    order.cardDesign?.subtitle?.trim() ||
    order.jobTitle?.trim() ||
    order.productTitle;
  const { slug, liveUrl: publicUrl } = resolveOrderLiveUrl(order);

  return {
    orderId: order.id,
    productTitle: order.productTitle,
    productId: order.productId,
    name,
    subtitle,
    slug,
    publicUrl,
    publicPath: `/${slug}`,
    status: order.status,
    createdAt: order.createdAt,
    accentColor:
      order.cardDesign?.lockedAccentColor ||
      order.cardDesign?.accentColor ||
      "#BC7C10",
    isLatest,
    isEditable: editable,
  };
}

export function getUserDashboardCards(phone: string): UserDashboardCard[] {
  const orders = getOrdersForPhone(phone).filter(isCardProductOrder);
  return orders.map((order, index) => orderToDashboardCard(order, index === 0));
}

export function getUserDashboardCardsFromOrders(
  orders: HexaOrder[],
): UserDashboardCard[] {
  return orders.map((order, index) => orderToDashboardCard(order, index === 0));
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
