import type { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  CARD_COLS,
  CARD_COLS_LEGACY,
  CARD_COLS_NO_EXTRA,
  isAccentColumnMissingError,
  isExtraMobilesColumnMissingError,
  type CardRow,
} from "@/lib/server/card-types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

/** Escape ILIKE wildcards so slug match stays exact (case-insensitive). */
function escapeIlikeExact(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function selectCardBySlug(
  supabase: SupabaseAdmin,
  cols: string,
  slug: string,
) {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return { data: null as CardRow | null, error: null as { message: string } | null };
  }

  // 1) Exact lowercase match (canonical new rows)
  let { data, error } = await supabase
    .from("cards")
    .select(cols)
    .eq("unic_card_name", normalized)
    .maybeSingle();

  if (error) return { data: null, error: { message: error.message } };
  if (data) return { data: data as CardRow, error: null };

  // 2) Legacy mixed-case unic_card_name (e.g. Mr-AbhayKhursale99)
  ({ data, error } = await supabase
    .from("cards")
    .select(cols)
    .ilike("unic_card_name", escapeIlikeExact(normalized))
    .limit(1)
    .maybeSingle());

  if (error) return { data: null, error: { message: error.message } };
  return { data: (data as CardRow | null) ?? null, error: null };
}

function isActiveCardStatus(status: unknown): boolean {
  if (status === true || status === 1 || status === "1") return true;
  const n = Number(status);
  return Number.isFinite(n) && n === 1;
}

/**
 * Public card lookup by unic_card_name (case-insensitive).
 * Active cards only (status = 1 / true).
 */
export async function findActiveCardRowBySlug(
  supabase: SupabaseAdmin,
  rawSlug: string,
): Promise<{ row: CardRow | null; error: string | null }> {
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  if (!slug) return { row: null, error: null };

  let result = await selectCardBySlug(supabase, CARD_COLS, slug);
  if (result.error && isExtraMobilesColumnMissingError(result.error.message)) {
    result = await selectCardBySlug(supabase, CARD_COLS_NO_EXTRA, slug);
  }
  if (result.error && isAccentColumnMissingError(result.error.message)) {
    result = await selectCardBySlug(supabase, CARD_COLS_LEGACY, slug);
  }

  if (result.error) return { row: null, error: result.error.message };
  if (!result.data) return { row: null, error: null };
  if (!isActiveCardStatus(result.data.status)) return { row: null, error: null };
  return { row: result.data, error: null };
}

/**
 * True when the card may be shown publicly.
 * Blocks only when linked orders exist and none are paid.
 * Cards with no order link (legacy / admin import) remain public.
 */
export async function cardHasPublicPaymentEntitlement(
  supabase: SupabaseAdmin,
  opts: { cardId: number; slug: string },
): Promise<boolean> {
  const slug = opts.slug.trim().toLowerCase();
  const cardId = opts.cardId;

  const filters = [
    slug ? `card_slug.ilike.${escapeIlikeExact(slug)}` : null,
    Number.isFinite(cardId) && cardId > 0 ? `card_id.eq.${cardId}` : null,
  ].filter(Boolean);

  if (filters.length === 0) return true;

  const { data } = await supabase
    .from("orders")
    .select("payment_status")
    .or(filters.join(","))
    .limit(20);

  const orderRows = (data as { payment_status: number | string }[] | null) ?? [];
  if (orderRows.length === 0) return true;
  return orderRows.some((o) => Number(o.payment_status) === 1);
}
