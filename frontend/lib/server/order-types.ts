import type { OrderCardDesignData } from "@/lib/order-card";

/** DB status: 0=placed, 1=shipped, 2=delivered */
export const ORDER_STATUS = {
  placed: 0,
  shipped: 1,
  delivered: 2,
} as const;

export const ORDER_STATUS_LABEL = ["placed", "shipped", "delivered"] as const;

/** DB payment: 0=pending, 1=paid, 2=failed, 3=refunded */
export const PAYMENT_STATUS = {
  pending: 0,
  paid: 1,
  failed: 2,
  refunded: 3,
} as const;

export const PAYMENT_STATUS_LABEL = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;

export type OrderRow = {
  order_id: number | string;
  user_id: number | string | null;
  product_id: number | string | null;
  name: string;
  mobile_number: string;
  designation: string;
  logo: string | null;
  bungalow: string;
  street_name: string;
  landmark: string;
  pincode: string;
  city: string;
  state: string;
  amount: number | string;
  date: string;
  status: number;
  payment_status: number;
  payment_method: string;
  delivery_charges: number | string;
  ord_date: string;
  nimbus_pushed: number;
  awb_number: string | null;
  courier_name: string | null;
  shipment_created_at: string | null;
  order_code: string;
  owner_phone: string;
  email: string;
  address: string;
  pack_title: string;
  qty: number;
  subtotal: number | string;
  discount: number | string;
  coupon: string | null;
  country_id: number | string | null;
  state_id: number | string | null;
  city_id: number | string | null;
  country_name: string;
  product_slug: string | null;
  product_title: string;
  card_id: number | string | null;
  card_slug: string | null;
  card_url: string | null;
  company_name: string;
  business_name: string;
  review_link: string | null;
  card_design: OrderCardDesignData | null;
  created_at: string;
  updated_at?: string;
};

export type OrderItemRow = {
  order_item_id: number | string;
  order_id: number | string;
  product_id: number | string | null;
  product_slug: string | null;
  product_title: string;
  pack_title: string;
  qty: number;
  unit_price: number | string;
  line_total: number | string;
  sort_order: number;
  created_at?: string;
};

export type OrderDto = {
  id: string;
  orderId: number;
  userId: number | null;
  createdAt: string;
  ordDate: string;
  date: string;
  status: (typeof ORDER_STATUS_LABEL)[number];
  paymentStatus: (typeof PAYMENT_STATUS_LABEL)[number];
  paymentMethod: string;
  deliveryCharges: number;
  nimbusPushed: boolean;
  awbNumber: string | null;
  courierName: string | null;
  shipmentCreatedAt: string | null;
  ownerPhone: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  bungalow: string;
  streetName: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryId: number | null;
  stateId: number | null;
  cityId: number | null;
  packTitle: string;
  qty: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon: string | null;
  productTitle: string;
  productId: string | null;
  productDbId: number | null;
  cardId: number | null;
  cardSlug: string | null;
  cardUrl: string | null;
  companyName: string;
  jobTitle: string;
  businessName: string;
  reviewLink: string | null;
  orderLogoSrc: string | null;
  cardDesign: OrderCardDesignData | null;
};

export type OrderWriteBody = {
  id?: string;
  orderCode?: string;
  ownerPhone?: string;
  customerName?: string;
  name?: string;
  phone?: string;
  mobileNumber?: string;
  email?: string;
  address?: string;
  bungalow?: string;
  streetName?: string;
  street_name?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  pincode?: string;
  country?: string;
  countryId?: number | null;
  stateId?: number | null;
  cityId?: number | null;
  packTitle?: string;
  qty?: number;
  subtotal?: number;
  discount?: number;
  total?: number;
  amount?: number;
  deliveryCharges?: number;
  delivery_charges?: number;
  paymentMethod?: string;
  payment_method?: string;
  coupon?: string | null;
  clientTxnId?: string | null;
  client_txn_id?: string | null;
  productTitle?: string;
  productId?: string | null;
  productSlug?: string | null;
  jobTitle?: string;
  designation?: string;
  companyName?: string;
  businessName?: string;
  reviewLink?: string | null;
  orderLogoSrc?: string | null;
  logo?: string | null;
  cardId?: number | null;
  card_id?: number | null;
  cardSlug?: string | null;
  cardUrl?: string | null;
  cardDesign?: OrderCardDesignData | null;
  status?: string | number;
  paymentStatus?: string | number;
  userId?: number | null;
  user_id?: number | null;
  nimbusPushed?: boolean | number;
  awbNumber?: string | null;
  courierName?: string | null;
  shipmentCreatedAt?: string | null;
};

export function statusToDb(value: string | number | undefined | null): number {
  if (typeof value === "number" && value >= 0 && value <= 2) return value;
  const key = String(value ?? "placed").toLowerCase();
  if (key in ORDER_STATUS) {
    return ORDER_STATUS[key as keyof typeof ORDER_STATUS];
  }
  return 0;
}

export function paymentToDb(value: string | number | undefined | null): number {
  if (typeof value === "number" && value >= 0 && value <= 3) return value;
  const key = String(value ?? "pending").toLowerCase();
  if (key in PAYMENT_STATUS) {
    return PAYMENT_STATUS[key as keyof typeof PAYMENT_STATUS];
  }
  return 0;
}

export function statusFromDb(n: number): (typeof ORDER_STATUS_LABEL)[number] {
  return ORDER_STATUS_LABEL[n] ?? "placed";
}

export function paymentFromDb(
  n: number,
): (typeof PAYMENT_STATUS_LABEL)[number] {
  return PAYMENT_STATUS_LABEL[n] ?? "pending";
}

export function mapOrder(row: OrderRow): OrderDto {
  const address =
    row.address ||
    [row.bungalow, row.street_name, row.landmark].filter(Boolean).join(", ");

  return {
    id: row.order_code,
    orderId: Number(row.order_id),
    userId: row.user_id == null ? null : Number(row.user_id),
    createdAt: row.ord_date || row.created_at,
    ordDate: row.ord_date || row.created_at,
    date: row.date,
    status: statusFromDb(Number(row.status) || 0),
    paymentStatus: paymentFromDb(Number(row.payment_status) || 0),
    paymentMethod: row.payment_method ?? "",
    deliveryCharges: Number(row.delivery_charges) || 0,
    nimbusPushed: Number(row.nimbus_pushed) === 1,
    awbNumber: row.awb_number,
    courierName: row.courier_name,
    shipmentCreatedAt: row.shipment_created_at,
    ownerPhone: row.owner_phone ?? "",
    customerName: row.name,
    phone: row.mobile_number,
    email: row.email ?? "",
    address,
    bungalow: row.bungalow ?? "",
    streetName: row.street_name ?? "",
    landmark: row.landmark ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    postalCode: row.pincode ?? "",
    country: row.country_name ?? "",
    countryId: row.country_id == null ? null : Number(row.country_id),
    stateId: row.state_id == null ? null : Number(row.state_id),
    cityId: row.city_id == null ? null : Number(row.city_id),
    packTitle: row.pack_title ?? "",
    qty: Number(row.qty) || 1,
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    total: Number(row.amount) || 0,
    coupon: row.coupon,
    productTitle: row.product_title ?? "",
    productId: row.product_slug,
    productDbId: row.product_id == null ? null : Number(row.product_id),
    cardId: row.card_id == null ? null : Number(row.card_id),
    cardSlug: row.card_slug,
    cardUrl: row.card_url,
    companyName: row.company_name ?? "",
    jobTitle: row.designation ?? "",
    businessName: row.business_name ?? "",
    reviewLink: row.review_link,
    orderLogoSrc: row.logo,
    cardDesign: row.card_design ?? null,
  };
}

/** Drop huge data-URL logos before writing to Postgres */
export function sanitizeCardDesignForDb(
  design: OrderCardDesignData | null | undefined,
): OrderCardDesignData | null {
  if (!design) return null;
  const logo = design.logoSrc;
  if (logo && logo.startsWith("data:") && logo.length > 4000) {
    return { ...design, logoSrc: undefined };
  }
  return design;
}

export function buildOrderInsertPayload(
  body: OrderWriteBody,
  opts: {
    orderCode: string;
    userId: number | null;
    productDbId: number | null;
  },
) {
  const qty = Math.max(1, Number(body.qty) || 1);
  const subtotal = Number(body.subtotal) || 0;
  const discount = Number(body.discount) || 0;
  const amount =
    body.amount !== undefined
      ? Number(body.amount) || 0
      : Number(body.total) || Math.max(0, subtotal - discount);
  const mobile = String(body.mobileNumber ?? body.phone ?? "")
    .replace(/\D/g, "")
    .slice(-10);
  const name =
    String(body.name ?? body.customerName ?? "").trim() || "Customer";
  const bungalow = String(body.bungalow ?? "").trim();
  const street = String(body.streetName ?? body.street_name ?? "").trim();
  const landmark = String(body.landmark ?? "").trim();
  const fullAddress = String(body.address ?? "").trim();
  const business = String(body.businessName ?? "").trim();
  const company = String(body.companyName ?? business).trim();

  // When checkout sends a single address line, fill structured columns too
  const resolvedBungalow = bungalow || (street || landmark ? bungalow : "");
  const resolvedStreet = street || (fullAddress && !bungalow ? fullAddress : street);
  const resolvedLandmark = landmark;
  const resolvedAddress = fullAddress || [resolvedBungalow, resolvedStreet, resolvedLandmark].filter(Boolean).join(", ");

  const logoRaw = body.logo ?? body.orderLogoSrc ?? null;
  const logo = logoRaw ? String(logoRaw).trim().slice(0, 255) : null;
  const productSlug =
    String(body.productSlug ?? body.productId ?? "").trim() || null;
  const now = new Date();

  const paymentKey = String(body.paymentStatus ?? "pending").toLowerCase();
  const paymentMethod = String(
    body.paymentMethod ??
      body.payment_method ??
      (paymentKey === "pending" ? "razorpay" : ""),
  ).trim();

  return {
    user_id: opts.userId,
    product_id: opts.productDbId,
    name,
    mobile_number: mobile,
    designation: String(body.designation ?? body.jobTitle ?? "").trim(),
    logo,
    bungalow: resolvedBungalow || fullAddress.slice(0, 255),
    street_name: resolvedStreet.slice(0, 255),
    landmark: resolvedLandmark.slice(0, 255),
    pincode: String(body.pincode ?? body.postalCode ?? "").trim(),
    city: String(body.city ?? "").trim(),
    state: String(body.state ?? "").trim(),
    amount,
    date: now.toISOString().slice(0, 10),
    status: statusToDb(body.status),
    payment_status: paymentToDb(body.paymentStatus ?? "pending"),
    payment_method: paymentMethod,
    delivery_charges: Number(
      body.deliveryCharges ?? body.delivery_charges ?? 0,
    ) || 0,
    ord_date: now.toISOString(),
    nimbus_pushed:
      body.nimbusPushed === true || Number(body.nimbusPushed) === 1 ? 1 : 0,
    awb_number: body.awbNumber ? String(body.awbNumber).trim() : null,
    courier_name: body.courierName ? String(body.courierName).trim() : null,
    shipment_created_at: body.shipmentCreatedAt || null,
    order_code: opts.orderCode,
    owner_phone: String(body.ownerPhone ?? mobile)
      .replace(/\D/g, "")
      .slice(-10),
    email: String(body.email ?? "").trim(),
    address: resolvedAddress,
    pack_title: String(body.packTitle ?? "").trim(),
    qty,
    subtotal,
    discount,
    coupon: body.coupon ? String(body.coupon).trim() : null,
    country_id:
      body.countryId == null || body.countryId === undefined
        ? null
        : Number(body.countryId) || null,
    state_id:
      body.stateId == null || body.stateId === undefined
        ? null
        : Number(body.stateId) || null,
    city_id:
      body.cityId == null || body.cityId === undefined
        ? null
        : Number(body.cityId) || null,
    country_name: String(body.country ?? "").trim(),
    product_slug: productSlug,
    product_title: String(body.productTitle ?? "").trim(),
    card_id:
      body.cardId != null || body.card_id != null
        ? Number(body.cardId ?? body.card_id) || null
        : null,
    card_slug: body.cardSlug ? String(body.cardSlug).trim() : null,
    card_url: body.cardUrl ? String(body.cardUrl).trim() : null,
    company_name: company,
    business_name: business,
    review_link: body.reviewLink ? String(body.reviewLink).trim() : null,
    card_design: sanitizeCardDesignForDb(body.cardDesign ?? null),
  };
}
