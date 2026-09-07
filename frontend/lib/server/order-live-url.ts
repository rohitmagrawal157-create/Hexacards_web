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

/** Single order — prefer linked cards.unic_card_name over stale orders.card_url. */
export async function mapOrderWithLinkedCard(
  supabase: SupabaseAdmin,
  row: OrderRow,
): Promise<OrderDto> {
  const dto = mapOrder(row);
  const cardId =
    row.card_id != null && Number(row.card_id) > 0 ? Number(row.card_id) : null;
  if (!cardId) return dto;

  const { data } = await supabase
    .from("cards")
    .select("unic_card_name")
    .eq("card_id", cardId)
    .maybeSingle();
  const slug = String(data?.unic_card_name ?? "").trim().toLowerCase();
  if (!slug) return dto;
  // Heal in background — do not block the API response
  void healOrderCardUrl(supabase, row, slug);
  return withLinkedSlug(dto, slug);
}

/**
 * Batch orders — overlay linked card slugs in memory.
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

  const slugByCardId = new Map<number, string>();
  if (cardIds.length > 0) {
    const { data: cards } = await supabase
      .from("cards")
      .select("card_id, unic_card_name")
      .in("card_id", cardIds);
    for (const card of cards ?? []) {
      const slug = String(card.unic_card_name ?? "").trim().toLowerCase();
      const id = Number(card.card_id);
      if (slug && id > 0) slugByCardId.set(id, slug);
    }
  }

  const heals: Promise<void>[] = [];
  const mapped = rows.map((row) => {
    const dto = mapOrder(row);
    const linked =
      row.card_id != null ? slugByCardId.get(Number(row.card_id)) : undefined;
    if (!linked) return dto;
    heals.push(healOrderCardUrl(supabase, row, linked));
    return withLinkedSlug(dto, linked);
  });

  if (heals.length > 0) {
    void Promise.all(heals).catch(() => {
      // background repair only
    });
  }

  return mapped;
}
