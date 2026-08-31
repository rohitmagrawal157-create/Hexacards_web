import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { syncCardsFromOrders } from "@/lib/server/card-sync-from-orders";

export const runtime = "nodejs";

/**
 * POST /api/cards/sync-from-orders
 * Backfill `cards` table from orders (Super Admin / one-time sync).
 */
export async function POST() {
  try {
    const result = await syncCardsFromOrders();
    return jsonOk(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    if (message.includes("does not exist") || message.includes("schema cache")) {
      return jsonError(
        400,
        "cards or orders table missing — run frontend/sql SQL files in Supabase",
        message,
      );
    }
    return jsonError(500, message);
  }
}
