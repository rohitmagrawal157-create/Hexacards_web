import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  mapPayment,
  PAYMENT_COLS,
  type PaymentRow,
  type PaymentWriteBody,
} from "@/lib/server/payment-types";
import { resolveExistingUserId } from "@/lib/server/resolve-user-id";
import { fetchAllSupabaseRows } from "@/lib/server/supabase-fetch-all";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");
    const customerId = searchParams.get("customer_id");
    const countOnly =
      searchParams.get("countOnly") === "1" ||
      searchParams.get("count") === "1";

    const supabase = getSupabaseAdmin();

    if (countOnly && !orderId && !customerId) {
      const { count, error } = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true });
      if (error) {
        return jsonError(500, "Failed to count payments", error.message);
      }
      return jsonOk({ count: count ?? 0 });
    }

    const { data, error } = await fetchAllSupabaseRows<PaymentRow>(
      async (from, to) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = supabase
          .from("payments")
          .select(PAYMENT_COLS)
          .order("id", { ascending: false })
          .range(from, to);

        if (orderId) {
          const id = Number(orderId);
          if (!Number.isInteger(id) || id <= 0) {
            return {
              data: null,
              error: { message: "order_id must be a positive integer" },
            };
          }
          query = query.eq("order_id", id);
        }
        if (customerId) {
          const id = Number(customerId);
          if (!Number.isInteger(id) || id <= 0) {
            return {
              data: null,
              error: { message: "customer_id must be a positive integer" },
            };
          }
          query = query.eq("customer_id", id);
        }

        const res = await query;
        return {
          data: (res.data as PaymentRow[] | null) ?? null,
          error: res.error ? { message: res.error.message } : null,
        };
      },
    );

    if (error) {
      if (error.message.includes("must be a positive integer")) {
        return jsonError(400, error.message);
      }
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

    return jsonOk(data.map(mapPayment));
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

    const supabase = getSupabaseAdmin();
    const customerId = await resolveExistingUserId(supabase, {
      explicit:
        body.customerId != null || body.customer_id != null
          ? Number(body.customerId ?? body.customer_id) || null
          : null,
    });

    const payload = {
      client_txn_id: clientTxnId.slice(0, 64),
      amount,
      customer_id: customerId,
      gateway_order_id:
        body.gatewayOrderId ?? body.gateway_order_id
          ? String(body.gatewayOrderId ?? body.gateway_order_id).slice(0, 100)
          : null,
      created_at: new Date().toISOString(),
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
    const { data: existing, error: existingError } = await supabase
      .from("payments")
      .select(PAYMENT_COLS)
      .eq("client_txn_id", clientTxnId)
      .maybeSingle();

    if (existingError) {
      return jsonError(500, "Failed to load existing payment", existingError.message);
    }

    const { data, error } = existing
      ? await supabase
          .from("payments")
          .update(payload)
          .eq("client_txn_id", clientTxnId)
          .select(PAYMENT_COLS)
          .single()
      : await supabase
          .from("payments")
          .insert(payload)
          .select(PAYMENT_COLS)
          .single();

    if (error) {
      return jsonError(500, "Failed to save payment", error.message);
    }

    if (payload.order_id != null) {
      const nextPaymentStatus =
        status.toLowerCase() === "success"
          ? "paid"
          : status.toLowerCase() === "failed"
            ? "failed"
            : status.toLowerCase() === "refunded"
              ? "refunded"
              : "pending";
      const orderPatch: Record<string, unknown> = {
        payment_status:
          nextPaymentStatus === "paid"
            ? 1
            : nextPaymentStatus === "failed"
              ? 2
              : nextPaymentStatus === "refunded"
                ? 3
                : 0,
      };
      if (status.toLowerCase() === "success") {
        orderPatch.payment_method = "razorpay";
      }
      // Failed / cancelled payment — never keep a public card link on the order
      if (nextPaymentStatus === "failed" || nextPaymentStatus === "refunded") {
        orderPatch.card_id = null;
        orderPatch.card_slug = null;
        orderPatch.card_url = null;
      }
      await supabase
        .from("orders")
        .update(orderPatch)
        .eq("order_id", payload.order_id);
    }

    return jsonOk(mapPayment(data as PaymentRow), existing ? 200 : 201);
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
