import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  buildOrderInsertPayload,
  mapOrder,
  type OrderRow,
  type OrderWriteBody,
} from "@/lib/server/order-types";

async function resolveUserId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  phone: string,
  explicit?: number | null,
): Promise<number | null> {
  if (explicit != null && Number.isFinite(explicit) && explicit > 0) {
    return Number(explicit);
  }
  const digits = String(phone || "").replace(/\D/g, "").slice(-10);
  if (!digits) return null;
  const { data } = await supabase
    .from("users")
    .select("user_id")
    .eq("mobile", digits)
    .maybeSingle();
  return data?.user_id != null ? Number(data.user_id) : null;
}

async function resolveProductId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  slug: string | null | undefined,
): Promise<number | null> {
  const s = String(slug ?? "").trim();
  if (!s) return null;
  const { data } = await supabase
    .from("products")
    .select("product_id")
    .eq("slug", s)
    .maybeSingle();
  return data?.product_id != null ? Number(data.product_id) : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const ownerPhone = searchParams.get("ownerPhone");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("orders")
      .select("*")
      .order("ord_date", { ascending: false });

    if (ownerPhone) {
      const digits = ownerPhone.replace(/\D/g, "").slice(-10);
      if (digits) query = query.eq("owner_phone", digits);
    } else if (phone) {
      const digits = phone.replace(/\D/g, "").slice(-10);
      if (digits) query = query.eq("mobile_number", digits);
    }

    const { data, error } = await query;
    if (error) {
      return jsonError(500, "Failed to load orders", error.message);
    }
    return jsonOk(((data as OrderRow[] | null) ?? []).map(mapOrder));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as OrderWriteBody;
    const customerName = String(
      body.name ?? body.customerName ?? "",
    ).trim();
    const phone = String(
      body.mobileNumber ?? body.phone ?? body.ownerPhone ?? "",
    )
      .replace(/\D/g, "")
      .slice(-10);

    if (!customerName) return jsonError(400, "name / customerName is required");
    if (!phone) return jsonError(400, "mobile_number / phone is required");

    const supabase = getSupabaseAdmin();
    const orderCode =
      String(body.id ?? body.orderCode ?? "").trim() ||
      `HC-${Date.now().toString().slice(-8)}`;

    const productSlug =
      String(body.productSlug ?? body.productId ?? "").trim() || null;
    const [userId, productDbId] = await Promise.all([
      resolveUserId(supabase, body.ownerPhone || phone, body.userId),
      resolveProductId(supabase, productSlug),
    ]);

    const payload = buildOrderInsertPayload(body, {
      orderCode,
      userId,
      productDbId,
    });

    const { data, error } = await supabase
      .from("orders")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return jsonError(500, "Failed to create order", error.message);
    }

    const row = data as OrderRow;
    const qty = Number(row.qty) || 1;
    const unit =
      qty > 0 ? Number(row.subtotal || 0) / qty : Number(row.amount || 0);

    await supabase.from("order_items").insert({
      order_id: row.order_id,
      product_id: row.product_id,
      product_slug: row.product_slug,
      product_title: row.product_title || "Product",
      pack_title: row.pack_title || "",
      qty,
      unit_price: unit,
      line_total: Number(row.amount) || 0,
      sort_order: 0,
    });

    // Record a payment row for this order (gateway can update later)
    const payStatus =
      Number(row.payment_status) === 1
        ? "success"
        : Number(row.payment_status) === 2
          ? "failed"
          : Number(row.payment_status) === 3
            ? "refunded"
            : "pending";
    const clientTxnId =
      `ord_${row.order_code}_${Date.now().toString(36)}`.slice(0, 64);
    await supabase.from("payments").insert({
      client_txn_id: clientTxnId,
      amount: Number(row.amount) || 0,
      customer_id: row.user_id,
      gateway_order_id: null,
      txn_at: payStatus === "success" ? new Date().toISOString() : null,
      remark: row.payment_method
        ? `method:${row.payment_method}`
        : "order checkout",
      status: payStatus,
      upi_txn_id: null,
      razorpay_payment_id: null,
      order_id: row.order_id,
    });

    return jsonOk(mapOrder(row), 201);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
