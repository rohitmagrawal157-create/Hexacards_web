import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { deleteCardForAdmin } from "@/lib/server/card-admin-delete";

export const runtime = "nodejs";

type AdminDeleteBody = {
  adminId?: string;
};

/**
 * POST /api/cards/admin-delete
 * Super Admin removes a card from DB and hides it on the user dashboard.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AdminDeleteBody;
    const adminId = String(body.adminId ?? "").trim();
    if (!adminId) {
      return jsonError(400, "adminId is required");
    }

    const result = await deleteCardForAdmin(adminId);
    return jsonOk(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    if (message.includes("card_hidden") && message.includes("does not exist")) {
      return jsonError(
        400,
        "card_hidden column missing — run frontend/sql/orders-card-hidden.sql in Supabase",
        message,
      );
    }
    return jsonError(500, message);
  }
}
