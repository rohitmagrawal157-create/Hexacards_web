import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hideOrdersFromDashboard } from "@/lib/server/order-dashboard-hide";

export type AdminCardDeleteResult = {
  deletedCardId: number | null;
  hiddenOrderCodes: string[];
};

/**
 * Super Admin card delete — removes the DB card and hides linked orders
 * from the user dashboard (order history is kept).
 */
export async function deleteCardForAdmin(
  adminId: string,
): Promise<AdminCardDeleteResult> {
  const supabase = getSupabaseAdmin();
  const raw = String(adminId ?? "").trim();
  if (!raw) {
    return { deletedCardId: null, hiddenOrderCodes: [] };
  }

  let cardId: number | null = null;
  const orderCodes = new Set<string>();

  if (raw.startsWith("card-")) {
    const parsed = Number(raw.slice(5));
    if (Number.isInteger(parsed) && parsed > 0) {
      cardId = parsed;
    }

    if (cardId) {
      const { data: byCardId } = await supabase
        .from("orders")
        .select("order_code")
        .eq("card_id", cardId);
      for (const row of byCardId ?? []) {
        if (row.order_code) orderCodes.add(String(row.order_code));
      }

      const { data: card } = await supabase
        .from("cards")
        .select("unic_card_name")
        .eq("card_id", cardId)
        .maybeSingle();

      const slug = String(card?.unic_card_name ?? "").trim().toLowerCase();
      if (slug) {
        const { data: bySlug } = await supabase
          .from("orders")
          .select("order_code")
          .eq("card_slug", slug);
        for (const row of bySlug ?? []) {
          if (row.order_code) orderCodes.add(String(row.order_code));
        }
      }
    }
  } else {
    orderCodes.add(raw);

    const { data: order } = await supabase
      .from("orders")
      .select("order_code, card_id, card_slug")
      .eq("order_code", raw)
      .maybeSingle();

    if (order?.order_code) orderCodes.add(String(order.order_code));
    if (order?.card_id != null && Number(order.card_id) > 0) {
      cardId = Number(order.card_id);
    } else if (order?.card_slug) {
      const { data: card } = await supabase
        .from("cards")
        .select("card_id")
        .eq("unic_card_name", String(order.card_slug).trim().toLowerCase())
        .maybeSingle();
      if (card?.card_id != null) cardId = Number(card.card_id);
    }
  }

  const hiddenOrderCodes = [...orderCodes];
  await hideOrdersFromDashboard(supabase, hiddenOrderCodes);

  if (cardId) {
    const { error: deleteErr } = await supabase
      .from("cards")
      .delete()
      .eq("card_id", cardId);

    if (deleteErr) {
      throw new Error(deleteErr.message);
    }
  }

  return { deletedCardId: cardId, hiddenOrderCodes };
}
