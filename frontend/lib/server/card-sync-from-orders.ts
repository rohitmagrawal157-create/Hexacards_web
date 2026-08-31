import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { OrderCardDesignData } from "@/lib/order-card";
import { isOrderCardHidden, type OrderRow } from "@/lib/server/order-types";
import { slugifyCardName } from "@/lib/server/card-types";

const NON_CARD_PRODUCT_SLUGS = new Set([
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

const NON_CARD_TITLE_KEYWORDS = [
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

function phoneTail(phone: string): string {
  return String(phone ?? "").replace(/\D/g, "").slice(-10);
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: "Customer", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function isCardProductOrderRow(row: OrderRow): boolean {
  const productSlug = String(row.product_slug ?? "").trim().toLowerCase();
  if (productSlug && NON_CARD_PRODUCT_SLUGS.has(productSlug)) return false;

  if (row.card_slug?.trim() || row.card_id) return true;

  const title = String(row.product_title ?? row.pack_title ?? "").toLowerCase();
  for (const kw of NON_CARD_TITLE_KEYWORDS) {
    if (title.includes(kw)) return false;
  }
  return (
    title.includes("nfc") ||
    title.includes("business card") ||
    title.includes("hexa card") ||
    title.includes("metal card") ||
    title.includes("hexa nfc") ||
    title.includes("digital profile") ||
    title.includes("digital qr")
  );
}

function buildSlugFromOrder(row: OrderRow): string {
  const existing = String(row.card_slug ?? "").trim().toLowerCase();
  if (existing) return existing;

  const name = String(row.name ?? "").trim() || "hexa-card";
  const base = slugifyCardName(name) || "hexa-card";
  const mobile = phoneTail(row.mobile_number || row.owner_phone);
  const phonePart = mobile.slice(-2);
  const orderTail = String(row.order_code ?? "")
    .replace(/\D/g, "")
    .slice(-2);
  return `${base}${phonePart}${orderTail}`.toLowerCase();
}

async function resolveOrCreateUserId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  row: OrderRow,
): Promise<number | null> {
  if (row.user_id != null && Number(row.user_id) > 0) {
    return Number(row.user_id);
  }
  const phone = phoneTail(row.owner_phone || row.mobile_number);
  if (!phone || phone.length !== 10) return null;

  const { data: existing } = await supabase
    .from("users")
    .select("user_id")
    .eq("mobile", phone)
    .maybeSingle();
  if (existing?.user_id != null) return Number(existing.user_id);

  const { firstName, lastName } = splitName(row.name);
  const { data: created, error } = await supabase
    .from("users")
    .insert({
      first_name: firstName,
      last_name: lastName,
      mobile: phone,
      email: row.email ? String(row.email).trim() : null,
      status: 1,
    })
    .select("user_id")
    .single();

  if (error || !created?.user_id) {
    console.warn("[cards/sync] user create failed", phone, error?.message);
    return null;
  }

  return Number(created.user_id);
}

/**
 * Create missing `cards` rows from `orders` and link orders.card_id.
 * Idempotent — safe to run on every Super Admin cards load.
 */
export async function syncCardsFromOrders(): Promise<{
  synced: number;
  linked: number;
  totalOrders: number;
  totalCards: number;
}> {
  const supabase = getSupabaseAdmin();
  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("*")
    .order("order_id", { ascending: true });

  if (ordersErr) {
    throw new Error(ordersErr.message);
  }

  const rows = (orders as OrderRow[] | null) ?? [];
  let synced = 0;
  let linked = 0;

  for (const order of rows) {
    if (isOrderCardHidden(order)) continue;
    if (!isCardProductOrderRow(order)) continue;

    const slug = buildSlugFromOrder(order);
    if (!slug) continue;

    const { data: existingCard } = await supabase
      .from("cards")
      .select("card_id")
      .eq("unic_card_name", slug)
      .maybeSingle();

    if (existingCard?.card_id) {
      const cardId = Number(existingCard.card_id);
      if (Number(order.card_id) !== cardId || order.card_slug !== slug) {
        await supabase
          .from("orders")
          .update({ card_id: cardId, card_slug: slug })
          .eq("order_id", order.order_id);
        linked += 1;
      }
      continue;
    }

    const userId = await resolveOrCreateUserId(supabase, order);
    if (!userId) continue;

    const cardDesign = order.card_design as
      | { name?: string; subtitle?: string; liveUrl?: string }
      | null;

    const insertPayload = {
      unic_card_name: slug,
      card_name: String(cardDesign?.name ?? order.name ?? "").trim() || "Card",
      job_name: String(order.designation ?? cardDesign?.subtitle ?? "").trim(),
      business_name: String(order.business_name ?? order.company_name ?? "").trim(),
      user_id: userId,
      logo: order.logo ? String(order.logo).slice(0, 255) : null,
      bg_img: null,
      bg_url: null,
      theme_id: 1,
      mobile: phoneTail(order.mobile_number || order.owner_phone),
      email: order.email ? String(order.email).trim() : null,
      website: null,
      code: "91",
      whatsapp: phoneTail(order.mobile_number || order.owner_phone) || null,
      state_id: order.state_id != null ? Number(order.state_id) : null,
      city_id: order.city_id != null ? Number(order.city_id) : null,
      address: order.address ? String(order.address) : null,
      about: null,
      about_company: null,
      services: null,
      brochure: null,
      page_view: 0,
      start_date: order.ord_date
        ? new Date(order.ord_date).toISOString().slice(0, 10)
        : null,
      end_date: null,
      status: 1,
    };

    const { data: created, error: insertErr } = await supabase
      .from("cards")
      .insert(insertPayload)
      .select("card_id")
      .single();

    if (insertErr || !created?.card_id) {
      console.warn(
        "[cards/sync] skip order",
        order.order_code,
        insertErr?.message,
      );
      continue;
    }

    const cardId = Number(created.card_id);
    await supabase
      .from("orders")
      .update({
        card_id: cardId,
        card_slug: slug,
        card_url: cardDesign?.liveUrl || `https://hexacards.com/${slug}`,
      })
      .eq("order_id", order.order_id);

    synced += 1;
  }

  const { count: cardCount } = await supabase
    .from("cards")
    .select("card_id", { count: "exact", head: true });

  return {
    synced,
    linked,
    totalOrders: rows.length,
    totalCards: cardCount ?? 0,
  };
}
