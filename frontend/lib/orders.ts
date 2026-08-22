import { getAuthUser, normalizeIndianPhone } from "@/lib/auth";

export type HexaOrderStatus = "placed" | "shipped" | "delivered";

export type HexaPaymentStatus = "paid" | "pending" | "failed" | "refunded";

import type { OrderCardDesignData } from "@/lib/order-card";
import { findOrderByPublicSlug, resolveOrderLiveUrl } from "@/lib/order-card";
import { persistOrderLogo, orderLogoRef, stripLogoForLocalStorage } from "@/lib/order-logo-store";

export type HexaOrder = {
  id: string;
  createdAt: string;
  status: HexaOrderStatus;
  paymentStatus?: HexaPaymentStatus;
  /** Logged-in account phone (10 digits) — used for dashboard ownership */
  ownerPhone: string;
  customerName: string;
  /** Shipping / contact phone */
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  packTitle: string;
  qty: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon?: string | null;
  productTitle: string;
  /** Product ID from product catalog (e.g. "google-standee", "instagram-card") */
  productId?: string;
  /** Digital card slug — used for QR / live URL */
  cardSlug?: string;
  /** Full live card URL */
  cardUrl?: string;
  companyName?: string;
  jobTitle?: string;
  /** For standee / social-media card orders: business/brand name entered at order time */
  businessName?: string;
  /** For standee / social-media card orders: the review/social link entered at order time */
  reviewLink?: string;
  /** For standee / social-media card orders: logo data URL or ref */
  orderLogoSrc?: string;
  /** Card customizer data saved at checkout */
  cardDesign?: OrderCardDesignData;
};

const ORDERS_KEY = "hexaOrders";

function phoneKey(phone: string | undefined | null): string {
  return normalizeIndianPhone(phone ?? "");
}

function orderOwnerKey(order: HexaOrder): string {
  return phoneKey(order.ownerPhone) || phoneKey(order.phone);
}

function isQuotaError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function compactOrderForStorage(order: HexaOrder): HexaOrder {
  if (!order.cardDesign?.logoSrc) return order;
  return {
    ...order,
    cardDesign: {
      ...order.cardDesign,
      logoSrc: stripLogoForLocalStorage(order.id, order.cardDesign.logoSrc),
    },
  };
}

function writeOrders(orders: HexaOrder[]) {
  if (typeof window === "undefined") return;

  const compact = orders.slice(0, 50).map(compactOrderForStorage);
  const attempts = [compact, compact.slice(0, 20), compact.slice(0, 10), compact.slice(0, 5), compact.slice(0, 1)];

  for (const next of attempts) {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
      return;
    } catch (error) {
      if (!isQuotaError(error)) throw error;
      try {
        localStorage.removeItem("hexaOrderCardProfiles");
      } catch {
        // ignore
      }
    }
  }

  try {
    localStorage.removeItem(ORDERS_KEY);
    try {
      localStorage.removeItem("hexaOrderCardProfiles");
    } catch {
      // ignore
    }
    localStorage.setItem(ORDERS_KEY, JSON.stringify(compact.slice(0, 1)));
  } catch (error) {
    if (!isQuotaError(error)) throw error;
    throw new Error(
      "Browser storage is full. Clear some site data and try placing the order again.",
    );
  }
}

function readOrders(): HexaOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HexaOrder[];
    if (!Array.isArray(parsed)) return [];
    // Normalize legacy rows that predate ownerPhone
    const orders = parsed.map((o) => ({
      ...o,
      ownerPhone: phoneKey(o.ownerPhone) || phoneKey(o.phone),
      phone: phoneKey(o.phone) || phoneKey(o.ownerPhone),
      paymentStatus: o.paymentStatus ?? "paid",
    }));

    // Move oversized logos out of localStorage so later saves do not hit quota.
    if (
      orders.some(
        (o) => o.cardDesign?.logoSrc?.startsWith("data:image/") && o.cardDesign.logoSrc.length > 4000,
      )
    ) {
      try {
        writeOrders(orders);
      } catch {
        // Keep in-memory orders even if compact write fails.
      }
    }

    return orders.map(compactOrderForStorage);
  } catch {
    return [];
  }
}

export function getOrders(): HexaOrder[] {
  return readOrders().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Orders belonging to a logged-in phone (last 10 digits). */
export function getOrdersForPhone(phone: string): HexaOrder[] {
  const digits = phoneKey(phone);
  if (!digits) return [];
  return getOrders().filter((o) => orderOwnerKey(o) === digits);
}

export function hasPlacedOrder(phone: string): boolean {
  return getOrdersForPhone(phone).length > 0;
}

export function getLatestOrder(): HexaOrder | null {
  return getOrders()[0] ?? null;
}

export function getLatestOrderForPhone(phone: string): HexaOrder | null {
  return getOrdersForPhone(phone)[0] ?? null;
}

export function getOrderById(id: string): HexaOrder | null {
  return getOrders().find((o) => o.id === id) ?? null;
}

export function findOrderByCardSlug(slug: string): HexaOrder | null {
  const orders = getOrders();
  const found = findOrderByPublicSlug(slug, orders);
  if (!found) return null;

  if (!found.cardSlug?.trim()) {
    const { slug: computed, liveUrl } = resolveOrderLiveUrl(found);
    return (
      updateOrder(found.id, {
        cardSlug: computed,
        cardUrl: liveUrl,
        cardDesign: found.cardDesign
          ? { ...found.cardDesign, liveUrl }
          : undefined,
      }) ?? found
    );
  }

  return found;
}

export async function saveOrder(
  order: Omit<HexaOrder, "id" | "createdAt" | "status" | "ownerPhone"> & {
    status?: HexaOrderStatus;
    ownerPhone?: string;
  },
): Promise<HexaOrder> {
  const auth = getAuthUser();
  const ownerPhone =
    phoneKey(order.ownerPhone) ||
    phoneKey(auth?.phone) ||
    phoneKey(order.phone);

  if (!ownerPhone) {
    throw new Error("Cannot place order without a signed-in phone number.");
  }

  const id = `HC-${Date.now().toString().slice(-8)}`;
  const next: HexaOrder = {
    ...order,
    id,
    createdAt: new Date().toISOString(),
    status: order.status ?? "placed",
    paymentStatus: order.paymentStatus ?? "paid",
    ownerPhone,
    phone: phoneKey(order.phone) || ownerPhone,
  };

  if (next.cardDesign?.logoSrc?.startsWith("data:image/")) {
    await persistOrderLogo(next.id, next.cardDesign.logoSrc);
    next.cardDesign = {
      ...next.cardDesign,
      logoSrc: orderLogoRef(next.id),
    };
  }

  const all = readOrders();
  all.unshift(next);
  writeOrders(all);
  window.dispatchEvent(new Event("hexa-orders-change"));
  return compactOrderForStorage(next);
}

export function updateOrder(
  id: string,
  patch: Partial<HexaOrder>,
): HexaOrder | null {
  const all = readOrders();
  const idx = all.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  all[idx] = compactOrderForStorage({ ...all[idx], ...patch });
  writeOrders(all);
  window.dispatchEvent(new Event("hexa-orders-change"));
  return all[idx];
}

export function formatOrderDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function statusLabel(status: HexaOrderStatus) {
  switch (status) {
    case "placed":
      return "Order placed";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
  }
}

export function paymentStatusLabel(status: HexaPaymentStatus) {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
  }
}

export function formatOrderAddress(order: Pick<
  HexaOrder,
  "address" | "city" | "postalCode" | "country"
>) {
  return [order.address, order.city, order.postalCode, order.country]
    .filter(Boolean)
    .join(", ");
}
