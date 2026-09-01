import { getAuthUser, normalizeIndianPhone } from "@/lib/auth";
import { apiFetch } from "@/lib/api-config";
import type { OrderCardDesignData } from "@/lib/order-card";
import { findOrderByPublicSlug, resolveOrderLiveUrl } from "@/lib/order-card";
import {
  persistOrderLogo,
  orderLogoRef,
  stripLogoForLocalStorage,
} from "@/lib/order-logo-store";

export type HexaOrderStatus = "placed" | "shipped" | "delivered";

export type HexaPaymentStatus = "paid" | "pending" | "failed" | "refunded";

export type HexaOrder = {
  id: string;
  orderId?: number;
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
  state?: string;
  postalCode: string;
  country: string;
  countryId?: number | null;
  stateId?: number | null;
  cityId?: number | null;
  packTitle: string;
  qty: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon?: string | null;
  clientTxnId?: string;
  productTitle: string;
  /** Product slug from catalog (e.g. "google-standee") */
  productId?: string;
  /** Supabase users.user_id when linked */
  userId?: number | null;
  /** Supabase cards.card_id when linked */
  cardId?: number | null;
  cardSlug?: string;
  cardUrl?: string;
  /** Hidden from user dashboard after Super Admin card delete */
  cardHidden?: boolean;
  companyName?: string;
  jobTitle?: string;
  businessName?: string;
  reviewLink?: string;
  orderLogoSrc?: string;
  cardDesign?: OrderCardDesignData;
};

const ORDERS_KEY = "hexaOrders";

/** True when Super Admin removed this order's card from the user dashboard. */
export function isOrderDashboardHidden(order: HexaOrder): boolean {
  return (
    Boolean(order.cardHidden) ||
    Boolean(order.cardDesign?.dashboardHidden)
  );
}

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
  const attempts = [
    compact,
    compact.slice(0, 20),
    compact.slice(0, 10),
    compact.slice(0, 5),
    compact.slice(0, 1),
  ];

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
    const orders = parsed.map((o) => ({
      ...o,
      ownerPhone: phoneKey(o.ownerPhone) || phoneKey(o.phone),
      phone: phoneKey(o.phone) || phoneKey(o.ownerPhone),
      paymentStatus: o.paymentStatus ?? "pending",
    }));

    if (
      orders.some(
        (o) =>
          o.cardDesign?.logoSrc?.startsWith("data:image/") &&
          o.cardDesign.logoSrc.length > 4000,
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

function dtoToHexaOrder(dto: HexaOrder & Record<string, unknown>): HexaOrder {
  return {
    id: String(dto.id),
    orderId:
      dto.orderId != null && Number(dto.orderId) > 0
        ? Number(dto.orderId)
        : undefined,
    createdAt: String(dto.createdAt),
    status: (dto.status as HexaOrderStatus) || "placed",
    paymentStatus: (dto.paymentStatus as HexaPaymentStatus) || "pending",
    ownerPhone: phoneKey(String(dto.ownerPhone ?? "")),
    customerName: String(dto.customerName ?? ""),
    phone: phoneKey(String(dto.phone ?? "")),
    email: String(dto.email ?? ""),
    address: String(dto.address ?? ""),
    city: String(dto.city ?? ""),
    state: dto.state ? String(dto.state) : undefined,
    postalCode: String(dto.postalCode ?? ""),
    country: String(dto.country ?? ""),
    countryId: (dto.countryId as number | null | undefined) ?? null,
    stateId: (dto.stateId as number | null | undefined) ?? null,
    cityId: (dto.cityId as number | null | undefined) ?? null,
    packTitle: String(dto.packTitle ?? ""),
    qty: Number(dto.qty) || 1,
    subtotal: Number(dto.subtotal) || 0,
    discount: Number(dto.discount) || 0,
    total: Number(dto.total) || 0,
    coupon: (dto.coupon as string | null | undefined) ?? null,
    clientTxnId: dto.clientTxnId ? String(dto.clientTxnId) : undefined,
    productTitle: String(dto.productTitle ?? ""),
    productId: dto.productId ? String(dto.productId) : undefined,
    userId:
      dto.userId != null && Number(dto.userId) > 0 ? Number(dto.userId) : null,
    cardId:
      dto.cardId != null && Number(dto.cardId) > 0 ? Number(dto.cardId) : null,
    cardSlug: dto.cardSlug ? String(dto.cardSlug) : undefined,
    cardUrl: dto.cardUrl ? String(dto.cardUrl) : undefined,
    cardHidden:
      Boolean(dto.cardHidden) ||
      Boolean(
        (dto.cardDesign as OrderCardDesignData | undefined)?.dashboardHidden,
      ),
    companyName: dto.companyName ? String(dto.companyName) : undefined,
    jobTitle: dto.jobTitle ? String(dto.jobTitle) : undefined,
    businessName: dto.businessName ? String(dto.businessName) : undefined,
    reviewLink: dto.reviewLink ? String(dto.reviewLink) : undefined,
    orderLogoSrc: dto.orderLogoSrc ? String(dto.orderLogoSrc) : undefined,
    cardDesign: (dto.cardDesign as OrderCardDesignData | undefined) ?? undefined,
  };
}

function orderToApiBody(order: Partial<HexaOrder> & { id?: string }) {
  return {
    id: order.id,
    ownerPhone: order.ownerPhone,
    customerName: order.customerName,
    phone: order.phone,
    email: order.email,
    address: order.address,
    city: order.city,
    state: order.state,
    postalCode: order.postalCode,
    country: order.country,
    countryId: order.countryId ?? null,
    stateId: order.stateId ?? null,
    cityId: order.cityId ?? null,
    packTitle: order.packTitle,
    qty: order.qty,
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.total,
    coupon: order.coupon ?? null,
    clientTxnId: order.clientTxnId ?? null,
    productTitle: order.productTitle,
    productId: order.productId ?? null,
    productSlug: order.productId ?? null,
    userId: order.userId ?? null,
    cardId: order.cardId ?? null,
    jobTitle: order.jobTitle,
    companyName: order.companyName ?? order.businessName,
    businessName: order.businessName,
    reviewLink: order.reviewLink ?? null,
    orderLogoSrc: order.orderLogoSrc ?? null,
    cardSlug: order.cardSlug ?? null,
    cardUrl: order.cardUrl ?? null,
    cardDesign: order.cardDesign ?? null,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod:
      order.paymentStatus === "pending" ? "razorpay" : undefined,
  };
}

/** Sync local cache (dashboard offline fallback). Prefer fetchOrders() for admin. */
export function getOrders(): HexaOrder[] {
  return readOrders().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Load orders from Supabase; falls back to localStorage. */
export async function fetchOrders(opts?: {
  phone?: string;
  ownerPhone?: string;
}): Promise<HexaOrder[]> {
  const params = new URLSearchParams();
  if (opts?.ownerPhone) params.set("ownerPhone", opts.ownerPhone);
  if (opts?.phone) params.set("phone", opts.phone);
  const qs = params.toString();
  const res = await apiFetch<HexaOrder[]>(
    `/api/orders${qs ? `?${qs}` : ""}`,
  );
  if (res.ok && Array.isArray(res.data)) {
    const mapped = res.data.map((d) => dtoToHexaOrder(d as HexaOrder & Record<string, unknown>));
    if (!opts?.phone && !opts?.ownerPhone && typeof window !== "undefined") {
      try {
        writeOrders(mapped);
      } catch {
        // ignore quota
      }
    }
    return mapped.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  return getOrders();
}

export function getOrdersForPhone(phone: string): HexaOrder[] {
  const digits = phoneKey(phone);
  if (!digits) return [];
  return getOrders().filter((o) => orderOwnerKey(o) === digits);
}

export async function fetchOrdersForPhone(phone: string): Promise<HexaOrder[]> {
  const digits = phoneKey(phone);
  if (!digits) return [];
  return fetchOrders({ ownerPhone: digits });
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

/** Hide card(s) on the user dashboard in local cache after admin delete. */
export function applyHiddenOrdersToLocalCache(orderCodes: string[]) {
  if (typeof window === "undefined" || orderCodes.length === 0) return;
  const codes = new Set(orderCodes.map((c) => String(c).trim()).filter(Boolean));
  if (codes.size === 0) return;

  const orders = readOrders();
  const next = orders.map((order) =>
    codes.has(order.id)
      ? {
          ...order,
          cardHidden: true,
          cardId: null,
          cardSlug: undefined,
          cardUrl: undefined,
          cardDesign: order.cardDesign
            ? { ...order.cardDesign, dashboardHidden: true }
            : ({ dashboardHidden: true } as OrderCardDesignData),
        }
      : order,
  );
  writeOrders(next);
  window.dispatchEvent(new Event("hexa-orders-change"));
}

/** Hide a card on the user dashboard after Super Admin delete (local cache). */
export function hideOrderCardOnDashboard(orderId: string) {
  applyHiddenOrdersToLocalCache([orderId]);
}

/** Add or refresh an order in localStorage (e.g. after admin provision). */
export function prependOrderToLocalCache(order: HexaOrder) {
  if (typeof window === "undefined") return;
  const orders = readOrders().filter((o) => o.id !== order.id);
  writeOrders([order, ...orders]);
  window.dispatchEvent(new Event("hexa-orders-change"));
}

export function findOrderByCardSlug(slug: string): HexaOrder | null {
  const orders = getOrders();
  const found = findOrderByPublicSlug(slug, orders);
  if (!found || isOrderDashboardHidden(found)) return null;

  if (!found.cardSlug?.trim()) {
    const { slug: computed, liveUrl } = resolveOrderLiveUrl(found);
    // Do not call updateOrder here — that dispatched events and froze the UI.
    return {
      ...found,
      cardSlug: computed,
      cardUrl: liveUrl,
      cardDesign: found.cardDesign
        ? { ...found.cardDesign, liveUrl }
        : undefined,
    };
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
  const clientTxnId =
    order.clientTxnId ?? `ord_${id}_${Date.now().toString(36)}`;
  const next: HexaOrder = {
    ...order,
    id,
    clientTxnId,
    createdAt: new Date().toISOString(),
    status: order.status ?? "placed",
    paymentStatus: order.paymentStatus ?? "pending",
    ownerPhone,
    phone: phoneKey(order.phone) || ownerPhone,
    userId:
      order.userId && order.userId > 0
        ? order.userId
        : auth?.userId && auth.userId > 0
          ? auth.userId
          : null,
    companyName: order.companyName ?? order.businessName,
  };

  if (next.cardDesign?.logoSrc?.startsWith("data:image/")) {
    await persistOrderLogo(next.id, next.cardDesign.logoSrc);
    next.cardDesign = {
      ...next.cardDesign,
      logoSrc: orderLogoRef(next.id),
    };
  }

  const apiRes = await apiFetch<HexaOrder>("/api/orders", {
    method: "POST",
    body: JSON.stringify(orderToApiBody(next)),
  });

  let saved = next;
  if (apiRes.ok && apiRes.data) {
    const mapped = dtoToHexaOrder(
      apiRes.data as HexaOrder & Record<string, unknown>,
    );
    saved = {
      ...next,
      ...mapped,
      orderId: mapped.orderId ?? next.orderId,
      cardDesign: next.cardDesign ?? mapped.cardDesign,
    };
  } else {
    console.error(
      "[orders] Supabase save failed — stored in browser only:",
      apiRes.error,
      apiRes.details,
    );
  }

  const all = readOrders();
  all.unshift(compactOrderForStorage(saved));
  writeOrders(all);
  window.dispatchEvent(new Event("hexa-orders-change"));
  return compactOrderForStorage(saved);
}

export async function updateOrder(
  id: string,
  patch: Partial<HexaOrder>,
): Promise<HexaOrder | null> {
  const all = readOrders();
  const idx = all.findIndex((o) => o.id === id);
  let local: HexaOrder | null = null;
  if (idx >= 0) {
    all[idx] = compactOrderForStorage({ ...all[idx], ...patch });
    writeOrders(all);
    local = all[idx];
    window.dispatchEvent(new Event("hexa-orders-change"));
  }

  const apiRes = await apiFetch<HexaOrder>(
    `/api/orders/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(orderToApiBody({ id, ...patch })),
    },
  );

  if (apiRes.ok && apiRes.data) {
    const mapped = dtoToHexaOrder(
      apiRes.data as HexaOrder & Record<string, unknown>,
    );
    if (idx >= 0) {
      all[idx] = compactOrderForStorage({
        ...mapped,
        cardDesign: patch.cardDesign ?? mapped.cardDesign ?? all[idx].cardDesign,
      });
      writeOrders(all);
      window.dispatchEvent(new Event("hexa-orders-change"));
      return all[idx];
    }
    return mapped;
  }

  if (!apiRes.ok) {
    console.error(
      "[orders] Supabase update failed:",
      apiRes.error,
      apiRes.details,
    );
  }

  return local;
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

export function formatOrderAddress(
  order: Pick<
    HexaOrder,
    "address" | "city" | "state" | "postalCode" | "country"
  >,
) {
  return [order.address, order.city, order.state, order.postalCode, order.country]
    .filter(Boolean)
    .join(", ");
}
