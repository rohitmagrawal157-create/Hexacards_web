import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  hideOrdersForUser,
  hideOrdersFromDashboard,
} from "@/lib/server/order-dashboard-hide";

export type AdminUserDeleteResult = {
  deletedUserId: number | null;
  deletedCardIds: number[];
  hiddenOrderCodes: string[];
};

function phoneFromAdminId(adminId: string): string {
  if (adminId.startsWith("u-")) {
    return adminId.slice(2).replace(/\D/g, "").slice(-10);
  }
  return "";
}

function userIdFromAdminId(adminId: string): number | null {
  if (!adminId.startsWith("db-")) return null;
  const n = Number(adminId.slice(3));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Super Admin user delete — removes user + their cards from DB
 * and hides all linked orders on the user dashboard.
 */
export async function deleteUserForAdmin(
  adminId: string,
): Promise<AdminUserDeleteResult> {
  const supabase = getSupabaseAdmin();
  const raw = String(adminId ?? "").trim();
  if (!raw) {
    return { deletedUserId: null, deletedCardIds: [], hiddenOrderCodes: [] };
  }

  let userId = userIdFromAdminId(raw);
  let mobile = phoneFromAdminId(raw);

  if (!userId && mobile) {
    const { data } = await supabase
      .from("users")
      .select("user_id, mobile")
      .eq("mobile", mobile)
      .maybeSingle();
    if (data?.user_id != null) userId = Number(data.user_id);
    if (data?.mobile) mobile = String(data.mobile).replace(/\D/g, "").slice(-10);
  }

  if (userId && !mobile) {
    const { data } = await supabase
      .from("users")
      .select("mobile")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.mobile) {
      mobile = String(data.mobile).replace(/\D/g, "").slice(-10);
    }
  }

  const deletedCardIds: number[] = [];

  if (userId) {
    const { data: cards } = await supabase
      .from("cards")
      .select("card_id")
      .eq("user_id", userId);
    for (const card of cards ?? []) {
      if (card.card_id != null) deletedCardIds.push(Number(card.card_id));
    }
    if (deletedCardIds.length > 0) {
      const { error } = await supabase
        .from("cards")
        .delete()
        .in("card_id", deletedCardIds);
      if (error) throw new Error(error.message);
    }
  }

  const hiddenOrderCodes = await hideOrdersForUser(supabase, {
    userId,
    mobile: mobile || null,
  });

  if (userId) {
    const { error } = await supabase.from("users").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  return {
    deletedUserId: userId,
    deletedCardIds,
    hiddenOrderCodes,
  };
}
