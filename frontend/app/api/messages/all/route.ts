import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";

/**
 * PUT /api/messages/all
 * Body: { markAllForOwner: "10-digit phone" } | { ownerPhone: "..." }
 * Marks all unread inbox messages for that owner as read.
 */
export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      markAllForOwner?: string;
      ownerPhone?: string;
    };
    const digits = String(body.markAllForOwner ?? body.ownerPhone ?? "")
      .replace(/\D/g, "")
      .slice(-10);
    if (!digits) return jsonError(400, "owner phone required");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("messages")
      .update({ is_read: 1 })
      .eq("owner_phone", digits)
      .eq("is_read", 0);

    if (error) {
      return jsonError(500, "Failed to mark messages read", error.message);
    }
    return jsonOk({ markedAll: true, ownerPhone: digits });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
