import type { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildPublicCardUrl } from "@/lib/site-url";
import { mapOrder, type OrderDto, type OrderRow } from "@/lib/server/order-types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

function withLinkedSlug(dto: OrderDto, slug: string): OrderDto {
  const clean = slug.trim().toLowerCase();
  if (!clean) return dto;
  return {
    ...dto,
    cardSlug: clean,
    cardUrl: buildPublicCardUrl(clean, "canonical"),
  };
}

function needsProductTitle(dto: OrderDto): boolean {
  return !String(dto.productTitle ?? "").trim();
}

async function healOrderCardUrl(
  supabase: SupabaseAdmin,
  row: OrderRow,
  slug: string,
) {
  const nextUrl = buildPublicCardUrl(slug, "canonical");
  const slugMismatch =
    String(row.card_slug ?? "").trim().toLowerCase() !== slug;
  const urlMismatch =
    String(row.card_url ?? "").trim().replace(/\/$/, "") !== nextUrl;
  if (!slugMismatch && !urlMismatch) return;
  await supabase
    .from("orders")
    .update({ card_slug: slug, card_url: nextUrl })
    .eq("order_id", row.order_id);
}

async function healOrderProductTitle(
  supabase: SupabaseAdmin,
  orderId: number,
  productTitle: string,
  productSlug?: string | null,
) {
  if (!orderId || !productTitle.trim()) return;
  const patch: Record<string, string> = {
    product_title: productTitle.trim().slice(0, 255),
  };
  if (productSlug?.trim()) {
    patch.product_slug = productSlug.trim().toLowerCase().slice(0, 160);
  }
  await supabase.from("orders").update(patch).eq("order_id", orderId);
}

/**
 * Fill empty productTitle / packTitle from products + order_items.
 * Heals orders.product_title in the background when resolved.
 */
async function enrichProductTitles(
  supabase: SupabaseAdmin,
  rows: OrderRow[],
  dtos: OrderDto[],
): Promise<OrderDto[]> {
  const missingIdx = dtos
    .map((dto, i) => (needsProductTitle(dto) ? i : -1))
    .filter((i) => i >= 0);
  if (missingIdx.length === 0) return dtos;

  const productIds = [
    ...new Set(
      missingIdx
        .map((i) => dtos[i].productDbId)
        .filter((id): id is number => Number.isInteger(id) && (id as number) > 0),
    ),
  ];
  const productSlugs = [
    ...new Set(
      missingIdx
        .map((i) => String(dtos[i].productId ?? "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const orderIds = missingIdx
    .map((i) => dtos[i].orderId)
    .filter((id) => id > 0);

  const titleByProductId = new Map<number, { title: string; slug: string }>();
  const titleBySlug = new Map<string, { title: string; slug: string }>();

  if (productIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("product_id, product_name, short_title, slug")
      .in("product_id", productIds);
    for (const p of data ?? []) {
      const id = Number(p.product_id);
      const title = String(p.short_title || p.product_name || "").trim();
      const slug = String(p.slug ?? "").trim().toLowerCase();
      if (id > 0 && title) titleByProductId.set(id, { title, slug });
    }
  }

  if (productSlugs.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("product_id, product_name, short_title, slug")
      .in("slug", productSlugs);
    for (const p of data ?? []) {
      const title = String(p.short_title || p.product_name || "").trim();
      const slug = String(p.slug ?? "").trim().toLowerCase();
      if (slug && title) titleBySlug.set(slug, { title, slug });
    }
  }

  const itemTitleByOrderId = new Map<number, string>();
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("order_id, product_title, pack_title, product_id, product_slug")
      .in("order_id", orderIds)
      .order("sort_order", { ascending: true });
    for (const item of items ?? []) {
      const oid = Number(item.order_id);
      if (!oid || itemTitleByOrderId.has(oid)) continue;
      const title = String(
        item.product_title || item.pack_title || "",
      ).trim();
      if (title && title.toLowerCase() !== "hexacards order") {
        itemTitleByOrderId.set(oid, title);
      }
      // Also learn product ids/slugs from line items
      const pid = Number(item.product_id);
      if (pid > 0 && !titleByProductId.has(pid)) {
        const fromItem = String(item.product_title || "").trim();
        if (fromItem) {
          titleByProductId.set(pid, {
            title: fromItem,
            slug: String(item.product_slug ?? "").trim().toLowerCase(),
          });
        }
      }
    }
  }

  const heals: Promise<void>[] = [];
  const next = dtos.map((dto, i) => {
    if (!needsProductTitle(dto)) return dto;

    const fromId =
      dto.productDbId && dto.productDbId > 0
        ? titleByProductId.get(dto.productDbId)
        : undefined;
    const slugKey = String(dto.productId ?? "").trim().toLowerCase();
    const fromSlug = slugKey ? titleBySlug.get(slugKey) : undefined;
    const fromItem = itemTitleByOrderId.get(dto.orderId);
    const fromPack = String(dto.packTitle ?? "").trim();

    const resolvedTitle =
      fromId?.title ||
      fromSlug?.title ||
      fromItem ||
      fromPack ||
      // Common legacy ₹499 SKU when product_id was never stored
      (Number(dto.total) === 499 ? "Digital Profile + QR" : "") ||
      "HexaCards product";

    const resolvedSlug =
      fromId?.slug || fromSlug?.slug || slugKey || null;

    if (
      dto.orderId > 0 &&
      resolvedTitle &&
      resolvedTitle !== "HexaCards product"
    ) {
      heals.push(
        healOrderProductTitle(
          supabase,
          dto.orderId,
          resolvedTitle,
          resolvedSlug,
        ),
      );
    }

    return {
      ...dto,
      productTitle: resolvedTitle,
      productId: resolvedSlug || dto.productId,
      packTitle: dto.packTitle?.trim() || resolvedTitle,
    };
  });

  if (heals.length > 0) {
    void Promise.all(heals).catch(() => {
      // background repair only
    });
  }

  return next;
}

/** Single order — prefer linked cards.unic_card_name over stale orders.card_url. */
export async function mapOrderWithLinkedCard(
  supabase: SupabaseAdmin,
  row: OrderRow,
): Promise<OrderDto> {
  let dto = mapOrder(row);
  const cardId =
    row.card_id != null && Number(row.card_id) > 0 ? Number(row.card_id) : null;
  if (cardId) {
    const { data } = await supabase
      .from("cards")
      .select("unic_card_name")
      .eq("card_id", cardId)
      .maybeSingle();
    const slug = String(data?.unic_card_name ?? "").trim().toLowerCase();
    if (slug) {
      void healOrderCardUrl(supabase, row, slug);
      dto = withLinkedSlug(dto, slug);
    }
  }

  const [enriched] = await enrichProductTitles(supabase, [row], [dto]);
  return enriched ?? dto;
}

/**
 * Batch orders — overlay linked card slugs + missing product titles.
 * DB heal runs in the background so list endpoints stay fast.
 */
export async function mapOrdersWithLinkedCards(
  supabase: SupabaseAdmin,
  rows: OrderRow[],
): Promise<OrderDto[]> {
  const cardIds = [
    ...new Set(
      rows
        .map((row) =>
          row.card_id != null && Number(row.card_id) > 0
            ? Number(row.card_id)
            : null,
        )
        .filter((id): id is number => id != null),
    ),
  ];

  const slugByCardId = new Map<
    number,
    { slug: string; mobile: string; userId: number | null }
  >();
  if (cardIds.length > 0) {
    const { data: cards } = await supabase
      .from("cards")
      .select("card_id, unic_card_name, mobile, user_id")
      .in("card_id", cardIds);
    for (const card of cards ?? []) {
      const slug = String(card.unic_card_name ?? "").trim().toLowerCase();
      const id = Number(card.card_id);
      if (slug && id > 0) {
        slugByCardId.set(id, {
          slug,
          mobile: String(card.mobile ?? "").replace(/\D/g, "").slice(-10),
          userId:
            card.user_id != null && Number(card.user_id) > 0
              ? Number(card.user_id)
              : null,
        });
      }
    }
  }

  const heals: Promise<void>[] = [];
  const mapped = rows.map((row) => {
    const dto = mapOrder(row);
    const linked =
      row.card_id != null ? slugByCardId.get(Number(row.card_id)) : undefined;
    if (!linked) return dto;

    const orderPhone =
      String(row.owner_phone ?? "").replace(/\D/g, "").slice(-10) ||
      String(row.mobile_number ?? "").replace(/\D/g, "").slice(-10);
    const orderUserId =
      row.user_id != null && Number(row.user_id) > 0
        ? Number(row.user_id)
        : null;
    const sameOwner =
      (orderPhone && linked.mobile && orderPhone === linked.mobile) ||
      (orderUserId != null &&
        linked.userId != null &&
        orderUserId === linked.userId);

    // Wrong card_id link must not rewrite this order to another person's slug.
    if (!sameOwner) return dto;

    heals.push(healOrderCardUrl(supabase, row, linked.slug));
    return withLinkedSlug(dto, linked.slug);
  });

  if (heals.length > 0) {
    void Promise.all(heals).catch(() => {
      // background repair only
    });
  }

  return enrichProductTitles(supabase, rows, mapped);
}
