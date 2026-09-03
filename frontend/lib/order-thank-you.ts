import type { HexaOrder } from "@/lib/orders";

export type OrderThankYouSummary = {
  id: string;
  productTitle: string;
  packTitle?: string;
  qty: number;
  total: number;
  createdAt: string;
  paymentStatus?: string;
};

const STORAGE_KEY = "hexaThankYouOrders.v1";

function readStore(): Record<string, OrderThankYouSummary> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, OrderThankYouSummary>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, OrderThankYouSummary>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota
  }
}

export function orderToThankYouSummary(order: HexaOrder): OrderThankYouSummary {
  return {
    id: order.id,
    productTitle: order.productTitle,
    packTitle: order.packTitle,
    qty: order.qty,
    total: order.total,
    createdAt: order.createdAt,
    paymentStatus: order.paymentStatus,
  };
}

export function saveOrderThankYouSummary(order: HexaOrder) {
  const summary = orderToThankYouSummary(order);
  const store = readStore();
  store[summary.id] = summary;
  writeStore(store);
}

export function readOrderThankYouSummary(
  orderId: string,
): OrderThankYouSummary | null {
  const id = String(orderId ?? "").trim();
  if (!id) return null;
  return readStore()[id] ?? null;
}

export function buildThankYouPath(orderId: string): string {
  return `/thank-you?order=${encodeURIComponent(orderId)}`;
}

/** Persist summary and go to thank-you immediately (do not wait on payment APIs). */
export function goToPaidThankYou(
  router: { replace: (href: string) => void },
  order: HexaOrder,
) {
  saveOrderThankYouSummary({ ...order, paymentStatus: "paid" });
  router.replace(buildThankYouPath(order.id));
}

export function buildPaymentFailedPath(
  orderId: string,
  retryPath?: string,
): string {
  const params = new URLSearchParams({
    order: orderId,
    status: "failed",
  });
  if (retryPath?.trim()) {
    params.set("retry", retryPath.trim());
  }
  return `/thank-you?${params.toString()}`;
}
