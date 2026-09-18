import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  buildOrderInsertPayload,
  type OrderRow,
  type OrderWriteBody,
} from "@/lib/server/order-types";
import {
  mapOrderWithLinkedCard,
  mapOrdersWithLinkedCards,
} from "@/lib/server/order-live-url";
import { resolveExistingUserId } from "@/lib/server/resolve-user-id";
import { insertStrippingUnknownColumns } from "@/lib/server/postgrest-schema-fallback";
import { fetchAllSupabaseRows } from "@/lib/server/supabase-fetch-all";

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

    const cardSlug = searchParams.get("cardSlug");
    const userIdParam = searchParams.get("userId") || searchParams.get("user_id");
    const countOnly =
      searchParams.get("countOnly") === "1" ||
      searchParams.get("count") === "1";

    const supabase = getSupabaseAdmin();

    if (countOnly && !phone && !ownerPhone && !cardSlug && !userIdParam) {
      const { count, error } = await supabase
        .from("orders")
        .select("order_id", { count: "exact", head: true });
      if (error) {
        return jsonError(500, "Failed to count orders", error.message);
      }
      return jsonOk({ count: count ?? 0 });
    }

    const { data, error } = await fetchAllSupabaseRows<OrderRow>(
      async (from, to) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = supabase
          .from("orders")
          .select("*")
          .order("ord_date", { ascending: false })
          .range(from, to);

        if (cardSlug) {
          const slug = cardSlug.trim().toLowerCase();
          if (slug) query = query.eq("card_slug", slug);
        } else if (ownerPhone || phone) {
          // Dashboard ownership: owner_phone is source of truth.
          // Schema default is '' (NOT NULL) — treat blank owner_phone like unset
          // and fall back to mobile_number. Never match another owner's shipping
          // phone when owner_phone is already set to someone else.
          const digits = (ownerPhone || phone || "")
            .replace(/\D/g, "")
            .slice(-10);
          if (digits) {
            if (ownerPhone) {
              // Owner phone only — do not return another customer's order just
              // because shipping mobile_number matches the logged-in user.
              // PostgREST: owner_phone.eq. matches empty string (varchar default).
              query = query.or(
                [
                  `owner_phone.eq.${digits}`,
                  `and(owner_phone.eq.,mobile_number.eq.${digits})`,
                  `and(owner_phone.is.null,mobile_number.eq.${digits})`,
                ].join(","),
              );
            } else {
              query = query.or(
                `owner_phone.eq.${digits},mobile_number.eq.${digits}`,
              );
            }
          }
        } else if (userIdParam) {
          const uid = Number(userIdParam);
          if (Number.isInteger(uid) && uid > 0) {
            query = query.eq("user_id", uid);
          }
        }

        const res = await query;
        return {
          data: (res.data as OrderRow[] | null) ?? null,
          error: res.error ? { message: res.error.message } : null,
        };
      },
    );

    if (error) {
      return jsonError(500, "Failed to load orders", error.message);
    }
    return jsonOk(await mapOrdersWithLinkedCards(supabase, data));
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
      resolveExistingUserId(supabase, {
        phone: body.ownerPhone || phone,
        explicit: body.userId ?? body.user_id,
      }),
      resolveProductId(supabase, productSlug),
    ]);

    const payload = buildOrderInsertPayload(body, {
      orderCode,
      userId,
      productDbId,
    });

    const {
      data,
      error,
      stripped,
    } = await insertStrippingUnknownColumns<OrderRow>(
      async (row) => {
        const res = await supabase
          .from("orders")
          .insert(row)
          .select("*")
          .single();
        return {
          data: (res.data as OrderRow | null) ?? null,
          error: res.error ? { message: res.error.message } : null,
        };
      },
      payload as Record<string, unknown>,
    );

    if (error || !data) {
      return jsonError(
        500,
        "Failed to create order",
        [
          error?.message,
          stripped.length
            ? `stripped missing columns: ${stripped.join(", ")}`
            : null,
          "If status is missing, run frontend/sql/orders-add-status-columns.sql in Supabase",
        ]
          .filter(Boolean)
          .join(" · "),
      );
    }

    if (stripped.length) {
      console.warn(
        "[orders] insert stripped unknown columns (run orders-add-status-columns.sql):",
        stripped.join(", "),
      );
    }

    const row = data as OrderRow;
    const qty = Number(row.qty) || 1;
    const lineTotal = Number(row.amount) || 0;
    const unit = qty > 0 ? lineTotal / qty : lineTotal;
    const sideErrors: string[] = [];

    const { error: itemErr } = await supabase.from("order_items").insert({
      order_id: row.order_id,
      product_id: row.product_id,
      product_slug: row.product_slug,
      product_title: row.product_title || "Product",
      pack_title: row.pack_title || "",
      qty,
      unit_price: unit,
      line_total: lineTotal,
      sort_order: 0,
    });
    if (itemErr) {
      sideErrors.push(`order_items: ${itemErr.message}`);
      console.error("[orders] order_items insert failed:", itemErr.message);
    }

    // Record a payment row for this order (gateway updates on Razorpay success)
    const payStatus =
      Number(row.payment_status) === 1
        ? "success"
        : Number(row.payment_status) === 2
          ? "failed"
          : Number(row.payment_status) === 3
            ? "refunded"
            : "pending";
    const clientTxnId = String(body.clientTxnId ?? body.client_txn_id ?? "")
      .trim()
      .slice(0, 64) ||
      `ord_${row.order_code}_${Date.now().toString(36)}`.slice(0, 64);

    const safeCustomerId = await resolveExistingUserId(supabase, {
      explicit: row.user_id != null ? Number(row.user_id) : null,
      phone: row.mobile_number || row.owner_phone,
    });

    const { error: payErr } = await supabase.from("payments").insert({
      client_txn_id: clientTxnId,
      amount: lineTotal,
      customer_id: safeCustomerId,
      gateway_order_id: null,
      created_at: new Date().toISOString(),
      txn_at: payStatus === "success" ? new Date().toISOString() : null,
      remark: `Order ${row.order_code}${row.payment_method ? ` · ${row.payment_method}` : ""}`,
      status: payStatus,
      upi_txn_id: null,
      razorpay_payment_id: null,
      order_id: row.order_id,
    });
    if (payErr) {
      sideErrors.push(`payments: ${payErr.message}`);
      console.error("[orders] payments insert failed:", payErr.message);
    }

    const mapped = await mapOrderWithLinkedCard(supabase, row);
    if (sideErrors.length) {
      return jsonOk(
        {
          ...mapped,
          _warnings: sideErrors,
        },
        201,
      );
    }
    return jsonOk(mapped, 201);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
