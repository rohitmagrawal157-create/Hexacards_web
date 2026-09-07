import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  saveCardImage,
  sanitizeCardUsername,
} from "@/lib/server/card-image-storage";

export const runtime = "nodejs";

/**
 * POST /api/orders/logo
 * Body: { orderId, dataUrl }
 *
 * Stores the NFC studio logo in the card-images bucket as
 * `{orderId}-order-logo.{png|jpg|pdf}` so Super Admin / PDFs can load it.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      orderId?: string;
      id?: string;
      dataUrl?: string;
      data_url?: string;
    };
    const orderId = String(body.orderId ?? body.id ?? "").trim();
    const dataUrl = body.dataUrl || body.data_url;
    if (!orderId) return jsonError(400, "orderId is required");
    if (!dataUrl?.startsWith("data:")) {
      return jsonError(400, "dataUrl image is required");
    }

    const saved = await saveCardImage({
      username: sanitizeCardUsername(orderId),
      kind: "order-logo",
      dataUrl,
    });

    return jsonOk({
      orderId,
      filename: saved.filename,
      path: saved.path,
      url: saved.path,
    });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Failed to save order logo",
    );
  }
}
