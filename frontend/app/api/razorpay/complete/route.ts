import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { mapOrder, type OrderRow } from "@/lib/server/order-types";
import {
  mapPayment,
  PAYMENT_COLS,
  type PaymentRow,
} from "@/lib/server/payment-types";

export const runtime = "nodejs";

function getRazorpaySecret(): string | undefined {
  return process.env.RAZORPAY_KEY_SECRET?.trim();
}

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

async function findOrderRow(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  opts: { orderId?: number | null; orderCode?: string | null },
): Promise<OrderRow | null> {
  if (opts.orderId && opts.orderId > 0) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", opts.orderId)
      .maybeSingle();
    if (data) return data as OrderRow;
  }
  const code = String(opts.orderCode ?? "").trim();
  if (code) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("order_code", code)
      .maybeSingle();
    if (data) return data as OrderRow;
  }
  return null;
}

/**
 * POST /api/razorpay/complete
 * Verify Razorpay payment and mark order + payment as paid (single server step).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const razorpayOrderId = String(
      body.razorpay_order_id ?? body.razorpayOrderId ?? "",
    ).trim();
    const razorpayPaymentId = String(
      body.razorpay_payment_id ?? body.razorpayPaymentId ?? "",
    ).trim();
    const razorpaySignature = String(
      body.razorpay_signature ?? body.razorpaySignature ?? "",
    ).trim();
    const orderCode = String(body.orderCode ?? body.id ?? "").trim();
    const orderId = Number(body.orderId ?? body.order_id);
    const clientTxnId = String(
      body.clientTxnId ?? body.client_txn_id ?? "",
    ).trim();
    const amount = Number(body.amount) || 0;
    const customerId =
      body.customerId != null || body.customer_id != null
        ? Number(body.customerId ?? body.customer_id) || null
        : null;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return jsonError(400, "Missing Razorpay payment fields");
    }
    if (!orderCode && (!Number.isInteger(orderId) || orderId <= 0)) {
      return jsonError(400, "orderCode or orderId is required");
    }

    const secret = getRazorpaySecret();
    if (!secret) {
      return jsonError(
        500,
        "Razorpay keys are not configured on the server",
      );
    }

    const valid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      secret,
    );
    if (!valid) {
      return jsonError(400, "Payment signature verification failed");
    }

    const supabase = getSupabaseAdmin();
    const orderRow = await findOrderRow(supabase, {
      orderId: Number.isInteger(orderId) && orderId > 0 ? orderId : null,
      orderCode,
    });

    if (!orderRow) {
      return jsonError(404, "Order not found for payment completion");
    }

    const dbOrderId = Number(orderRow.order_id);
    const txnId =
      clientTxnId ||
      `ord_${orderRow.order_code}_${Date.now().toString(36)}`.slice(0, 64);
    const payAmount = amount > 0 ? amount : Number(orderRow.amount) || 0;
    const now = new Date().toISOString();

    const paymentPayload = {
      client_txn_id: txnId.slice(0, 64),
      amount: payAmount,
      customer_id:
        customerId ??
        (orderRow.user_id != null ? Number(orderRow.user_id) : null),
      gateway_order_id: razorpayOrderId.slice(0, 100),
      txn_at: now,
      remark: `Order ${orderRow.order_code} — Razorpay paid`,
      status: "success",
      upi_txn_id: razorpayPaymentId.slice(0, 100),
      razorpay_payment_id: razorpayPaymentId.slice(0, 100),
      order_id: dbOrderId,
    };

    let existingPay: PaymentRow | null = null;
    if (txnId) {
      const { data } = await supabase
        .from("payments")
        .select(PAYMENT_COLS)
        .eq("client_txn_id", txnId.slice(0, 64))
        .maybeSingle();
      if (data) existingPay = data as PaymentRow;
    }
    if (!existingPay) {
      const { data } = await supabase
        .from("payments")
        .select(PAYMENT_COLS)
        .eq("order_id", dbOrderId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) existingPay = data as PaymentRow;
    }

    let paymentRow: PaymentRow;
    if (existingPay) {
      const { data, error } = await supabase
        .from("payments")
        .update(paymentPayload)
        .eq("id", (existingPay as PaymentRow).id)
        .select(PAYMENT_COLS)
        .single();
      if (error) {
        return jsonError(500, "Failed to update payment", error.message);
      }
      paymentRow = data as PaymentRow;
    } else {
      const { data, error } = await supabase
        .from("payments")
        .insert(paymentPayload)
        .select(PAYMENT_COLS)
        .single();
      if (error) {
        return jsonError(500, "Failed to save payment", error.message);
      }
      paymentRow = data as PaymentRow;
    }

    const orderUpdate: Record<string, unknown> = {
      payment_status: 1,
      payment_method: "razorpay",
      updated_at: now,
    };
    if (!orderRow.user_id && customerId) {
      orderUpdate.user_id = customerId;
    }

    const { data: updatedOrder, error: orderErr } = await supabase
      .from("orders")
      .update(orderUpdate)
      .eq("order_id", dbOrderId)
      .select("*")
      .single();

    if (orderErr) {
      return jsonError(500, "Failed to mark order paid", orderErr.message);
    }

    return jsonOk({
      order: mapOrder(updatedOrder as OrderRow),
      payment: mapPayment(paymentRow),
      verified: true,
    });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Payment completion failed",
    );
  }
}
