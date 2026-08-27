import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  mapPayment,
  PAYMENT_COLS,
  type PaymentRow,
  type PaymentWriteBody,
} from "@/lib/server/payment-types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");
    const customerId = searchParams.get("customer_id");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("payments")
      .select(PAYMENT_COLS)
      .order("id", { ascending: false });

    if (orderId) {
      const id = Number(orderId);
      if (!Number.isInteger(id) || id <= 0) {
        return jsonError(400, "order_id must be a positive integer");
      }
      query = query.eq("order_id", id);
    }
    if (customerId) {
      const id = Number(customerId);
      if (!Number.isInteger(id) || id <= 0) {
        return jsonError(400, "customer_id must be a positive integer");
      }
      query = query.eq("customer_id", id);
    }

    const { data, error } = await query;
    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "payments table missing — run frontend/sql/payments-table.sql",
        );
      }
      return jsonError(500, "Failed to load payments", error.message);
    }

    return jsonOk((data as PaymentRow[] | null ?? []).map(mapPayment));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PaymentWriteBody;
    const clientTxnId =
      String(body.clientTxnId ?? body.client_txn_id ?? "").trim() ||
      `txn_${Date.now().toString(36)}`;
    const amount = Number(body.amount) || 0;
    const status = String(body.status ?? "pending").trim() || "pending";

    const payload = {
      client_txn_id: clientTxnId.slice(0, 64),
      amount,
      customer_id:
        body.customerId != null || body.customer_id != null
          ? Number(body.customerId ?? body.customer_id) || null
          : null,
      gateway_order_id:
        body.gatewayOrderId ?? body.gateway_order_id
          ? String(body.gatewayOrderId ?? body.gateway_order_id).slice(0, 100)
          : null,
      txn_at: body.txnAt ?? body.txn_at ?? (status === "success" ? new Date().toISOString() : null),
      remark: body.remark ? String(body.remark) : null,
      status: status.slice(0, 30),
      upi_txn_id:
        body.upiTxnId ?? body.upi_txn_id
          ? String(body.upiTxnId ?? body.upi_txn_id).slice(0, 100)
          : null,
      razorpay_payment_id:
        body.razorpayPaymentId ?? body.razorpay_payment_id
          ? String(body.razorpayPaymentId ?? body.razorpay_payment_id).slice(
              0,
              100,
            )
          : null,
      order_id:
        body.orderId != null || body.order_id != null
          ? Number(body.orderId ?? body.order_id) || null
          : null,
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("payments")
      .insert(payload)
      .select(PAYMENT_COLS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return jsonError(409, "client_txn_id already exists");
      }
      return jsonError(500, "Failed to create payment", error.message);
    }

    return jsonOk(mapPayment(data as PaymentRow), 201);
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
