import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { OrderCardDesignData } from "@/lib/order-card";

function isMissingCardHiddenColumn(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("card_hidden") &&
    (lower.includes("schema cache") || lower.includes("does not exist"))
  );
}

/** Hide card-product orders from the user dashboard (keeps order history). */
export async function hideOrdersFromDashboard(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orderCodes: string[],
): Promise<void> {
  if (orderCodes.length === 0) return;

  const { error: bulkErr } = await supabase
    .from("orders")
    .update({
      card_hidden: 1,
      card_slug: null,
      card_url: null,
    })
    .in("order_code", orderCodes);

  if (!bulkErr) return;

  if (!isMissingCardHiddenColumn(bulkErr.message)) {
    throw new Error(bulkErr.message);
  }

  const { data: rows, error: loadErr } = await supabase
    .from("orders")
    .select("order_code, card_design")
    .in("order_code", orderCodes);

  if (loadErr) throw new Error(loadErr.message);

  for (const row of rows ?? []) {
    const code = String(row.order_code ?? "").trim();
    if (!code) continue;

    const existing =
      (row.card_design as OrderCardDesignData | Record<string, unknown> | null) ??
      {};
    const { error: rowErr } = await supabase
      .from("orders")
      .update({
        card_slug: null,
        card_url: null,
        card_design: { ...existing, dashboardHidden: true },
      })
      .eq("order_code", code);

    if (rowErr) throw new Error(rowErr.message);
  }
}

export async function hideOrdersForUser(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  opts: { userId?: number | null; mobile?: string | null },
): Promise<string[]> {
  const codes = new Set<string>();
  const mobile = String(opts.mobile ?? "")
    .replace(/\D/g, "")
    .slice(-10);

  if (opts.userId && opts.userId > 0) {
    const { data } = await supabase
      .from("orders")
      .select("order_code")
      .eq("user_id", opts.userId);
    for (const row of data ?? []) {
      if (row.order_code) codes.add(String(row.order_code));
    }
  }

  if (mobile) {
    const { data } = await supabase
      .from("orders")
      .select("order_code")
      .or(`owner_phone.eq.${mobile},mobile_number.eq.${mobile}`);
    for (const row of data ?? []) {
      if (row.order_code) codes.add(String(row.order_code));
    }
  }

  const orderCodes = [...codes];
  await hideOrdersFromDashboard(supabase, orderCodes);
  return orderCodes;
}
