import type { getSupabaseAdmin } from "@/lib/supabase/server";
import { sanitizeCardUsername } from "@/lib/server/card-image-storage";
import { slugifyCardName } from "@/lib/server/card-types";
import { fetchAllSupabaseRows } from "@/lib/server/supabase-fetch-all";
import { buildPublicCardUrl } from "@/lib/site-url";
import {
  allocateUniqueSlugFromName,
  nextAvailableSlug,
  slugifyForCardLink,
  stripSlugNumericSuffix,
} from "@/lib/card-slug-unique";

export {
  nextAvailableSlug,
  stripSlugNumericSuffix,
  allocateUniqueSlugFromName,
} from "@/lib/card-slug-unique";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

export function baseCardSlugFromName(name: string): string {
  const base = slugifyCardName(name) || "hexa-card";
  return sanitizeCardUsername(base);
}

/** Next free slug: base, base2, base3, … from a display name. */
export function allocateUniqueCardSlug(
  name: string,
  taken: Set<string>,
  excludeSlug?: string,
): string {
  return allocateUniqueSlugFromName(name, taken, excludeSlug);
}

export async function fetchTakenCardSlugs(
  supabase: SupabaseAdmin,
): Promise<Set<string>> {
  const taken = new Set<string>();

  const cards = await fetchAllSupabaseRows<{ unic_card_name: string | null }>(
    async (from, to) => {
      const res = await supabase
        .from("cards")
        .select("unic_card_name")
        .order("card_id", { ascending: true })
        .range(from, to);
      return {
        data: (res.data as { unic_card_name: string | null }[] | null) ?? null,
        error: res.error ? { message: res.error.message } : null,
      };
    },
  );
  for (const row of cards.data) {
    const slug = String(row.unic_card_name ?? "").trim().toLowerCase();
    if (slug) taken.add(slug);
  }

  const orders = await fetchAllSupabaseRows<{ card_slug: string | null }>(
    async (from, to) => {
      const res = await supabase
        .from("orders")
        .select("card_slug")
        .order("order_id", { ascending: true })
        .range(from, to);
      return {
        data: (res.data as { card_slug: string | null }[] | null) ?? null,
        error: res.error ? { message: res.error.message } : null,
      };
    },
  );
  for (const row of orders.data) {
    const slug = String(row.card_slug ?? "").trim().toLowerCase();
    if (slug) taken.add(slug);
  }

  return taken;
}

export async function allocateCardSlugForName(
  supabase: SupabaseAdmin,
  name: string,
  excludeSlug?: string,
): Promise<string> {
  const taken = await fetchTakenCardSlugs(supabase);
  return allocateUniqueCardSlug(name, taken, excludeSlug);
}

export async function allocateCardSlugPreferred(
  supabase: SupabaseAdmin,
  preferred: string,
  excludeSlug?: string,
): Promise<string> {
  const taken = await fetchTakenCardSlugs(supabase);
  return nextAvailableSlug(preferred, taken, excludeSlug);
}

export type SlugRepairChange = {
  kind: "card" | "order";
  id: number;
  from: string;
  to: string;
};

function slugFromUrl(url?: string | null): string {
  if (!url?.trim()) return "";
  const raw = url.trim();
  try {
    const path = raw.includes("://") ? new URL(raw).pathname : raw;
    return (
      path.replace(/^\/+|\/+$/g, "").split("/")[0]?.toLowerCase() ?? ""
    );
  } catch {
    return raw.replace(/^\/+|\/+$/g, "").split("/")[0]?.toLowerCase() ?? "";
  }
}

function isDigitalProduct(productSlug: string, productTitle: string): boolean {
  const slug = productSlug.trim().toLowerCase();
  const title = productTitle.trim().toLowerCase();
  if (
    slug === "digital-profile-qr" ||
    slug === "nfc-business-card" ||
    slug.includes("digital") ||
    slug.includes("nfc")
  ) {
    return true;
  }
  return (
    title.includes("nfc") ||
    title.includes("digital profile") ||
    title.includes("digital qr") ||
    title.includes("business card") ||
    title.includes("hexa card") ||
    title.includes("hexa nfc")
  );
}

/**
 * 1) Cards: oldest card_id keeps a colliding unic_card_name; later → base2, base3…
 * 2) Orphan paid digital orders with empty/colliding links get a unique card_slug.
 *    Skips placeholder names (hexa-card / your-name) to avoid mass junk writes.
 */
export async function repairDuplicateCardSlugs(
  supabase: SupabaseAdmin,
): Promise<{ repaired: number; changes: SlugRepairChange[] }> {
  const cards = await fetchAllSupabaseRows<{
    card_id: number | string;
    unic_card_name: string | null;
    card_name: string | null;
  }>(async (from, to) => {
    const res = await supabase
      .from("cards")
      .select("card_id, unic_card_name, card_name")
      .order("card_id", { ascending: true })
      .range(from, to);
    return {
      data:
        (res.data as
          | {
              card_id: number | string;
              unic_card_name: string | null;
              card_name: string | null;
            }[]
          | null) ?? null,
      error: res.error ? { message: res.error.message } : null,
    };
  });

  const changes: SlugRepairChange[] = [];
  const taken = new Set<string>();

  for (const row of cards.data) {
    const cardId = Number(row.card_id);
    if (!Number.isInteger(cardId) || cardId <= 0) continue;

    const current = slugifyForCardLink(String(row.unic_card_name ?? ""));
    const nameHint =
      String(row.card_name ?? "").trim() || current || "hexa-card";

    let next: string;
    if (!current) {
      next = allocateUniqueCardSlug(nameHint, taken);
    } else if (!taken.has(current)) {
      next = current;
    } else {
      next = allocateUniqueCardSlug(nameHint, taken);
    }
    taken.add(next);

    if (next === current) continue;

    changes.push({
      kind: "card",
      id: cardId,
      from: current || "(empty)",
      to: next,
    });
    const cardUrl = buildPublicCardUrl(next, "canonical");
    const { error } = await supabase
      .from("cards")
      .update({ unic_card_name: next })
      .eq("card_id", cardId);
    if (error) {
      console.warn("[repair-slugs] card", cardId, error.message);
      continue;
    }
    await supabase
      .from("orders")
      .update({ card_slug: next, card_url: cardUrl })
      .eq("card_id", cardId);
  }

  const orders = await fetchAllSupabaseRows<{
    order_id: number | string;
    card_id: number | string | null;
    card_slug: string | null;
    card_url: string | null;
    name: string | null;
    product_slug: string | null;
    product_title: string | null;
    payment_status: number | string | null;
    card_design: { liveUrl?: string } | null;
  }>(async (from, to) => {
    const res = await supabase
      .from("orders")
      .select(
        "order_id, card_id, card_slug, card_url, name, product_slug, product_title, payment_status, card_design",
      )
      .order("order_id", { ascending: true })
      .range(from, to);
    return {
      data:
        (res.data as
          | {
              order_id: number | string;
              card_id: number | string | null;
              card_slug: string | null;
              card_url: string | null;
              name: string | null;
              product_slug: string | null;
              product_title: string | null;
              payment_status: number | string | null;
              card_design: { liveUrl?: string } | null;
            }[]
          | null) ?? null,
      error: res.error ? { message: res.error.message } : null,
    };
  });

  for (const row of orders.data) {
    if (Number(row.payment_status) !== 1) continue;
    if (
      !isDigitalProduct(
        String(row.product_slug ?? ""),
        String(row.product_title ?? ""),
      )
    ) {
      continue;
    }
    const orderId = Number(row.order_id);
    if (!Number.isInteger(orderId) || orderId <= 0) continue;
    if (row.card_id != null && Number(row.card_id) > 0) continue;

    const stored = slugifyForCardLink(String(row.card_slug ?? ""));
    const fromUrl =
      slugFromUrl(row.card_url) ||
      slugFromUrl(row.card_design?.liveUrl ?? null);
    const fromName = slugifyForCardLink(String(row.name ?? ""));
    const preferred = stored || fromUrl || fromName;

    if (!preferred || preferred === "hexa-card" || preferred === "your-name") {
      continue;
    }

    // Already has a unique stored slug
    if (stored && !taken.has(stored)) {
      taken.add(stored);
      continue;
    }

    // Empty slug, or stored slug collides with an earlier claim
    const next = nextAvailableSlug(preferred, taken);
    taken.add(next);
    if (stored === next) continue;

    const cardUrl = buildPublicCardUrl(next, "canonical");
    const design =
      row.card_design && typeof row.card_design === "object"
        ? { ...row.card_design, liveUrl: cardUrl }
        : row.card_design;

    const { error } = await supabase
      .from("orders")
      .update({ card_slug: next, card_url: cardUrl, card_design: design })
      .eq("order_id", orderId);
    if (error) {
      console.warn("[repair-slugs] order", orderId, error.message);
      continue;
    }
    changes.push({
      kind: "order",
      id: orderId,
      from: stored || "(empty)",
      to: next,
    });
  }

  return { repaired: changes.length, changes };
}
