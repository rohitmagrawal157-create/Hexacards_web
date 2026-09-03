import { getSupabaseAdmin } from "@/lib/supabase/server";
import { saveCardImage, sanitizeCardUsername } from "@/lib/server/card-image-storage";
import { jsonError, jsonOk, toNumber } from "@/lib/admin-catalog-db";
import type { OrderCardDesignData } from "@/lib/order-card";
import {
  mapOrder,
  mergeCardDesignForDb,
  orderLogoColumnValue,
  paymentToDb,
  sanitizeCardDesignForDb,
  statusToDb,
  type OrderRow,
  type OrderWriteBody,
} from "@/lib/server/order-types";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function syncOrderItems(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  row: OrderRow,
) {
  const qty = Number(row.qty) || 1;
  const lineTotal = Number(row.amount) || 0;
  const unit = qty > 0 ? lineTotal / qty : lineTotal;

  const { data: existing } = await supabase
    .from("order_items")
    .select("order_item_id")
    .eq("order_id", row.order_id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const itemPayload = {
    product_id: row.product_id,
    product_slug: row.product_slug,
    product_title: row.product_title || "Product",
    pack_title: row.pack_title || "",
    qty,
    unit_price: unit,
    line_total: lineTotal,
  };

  if (existing?.order_item_id) {
    await supabase
      .from("order_items")
      .update(itemPayload)
      .eq("order_item_id", existing.order_item_id);
  } else {
    await supabase.from("order_items").insert({
      order_id: row.order_id,
      ...itemPayload,
      sort_order: 0,
    });
  }
}

async function findOrder(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  id: string,
): Promise<OrderRow | null> {
  const raw = String(id).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", Number(raw))
      .maybeSingle();
    if (data) return data as OrderRow;
  }

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("order_code", raw)
    .maybeSingle();
  return (data as OrderRow | null) ?? null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const supabase = getSupabaseAdmin();
    const row = await findOrder(supabase, id);
    if (!row) return jsonError(404, "Order not found");
    return jsonOk(mapOrder(row));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const body = (await request.json().catch(() => ({}))) as OrderWriteBody;
    const supabase = getSupabaseAdmin();
    const existing = await findOrder(supabase, id);
    if (!existing) return jsonError(404, "Order not found");

    const patch: Record<string, unknown> = {};

    if (body.customerName !== undefined || body.name !== undefined) {
      patch.name = String(body.name ?? body.customerName ?? "").trim();
    }
    if (body.phone !== undefined || body.mobileNumber !== undefined) {
      patch.mobile_number = String(body.mobileNumber ?? body.phone ?? "")
        .replace(/\D/g, "")
        .slice(-10);
    }
    if (body.ownerPhone !== undefined) {
      patch.owner_phone = String(body.ownerPhone).replace(/\D/g, "").slice(-10);
    }
    if (body.email !== undefined) patch.email = String(body.email).trim();
    if (body.address !== undefined) patch.address = String(body.address).trim();
    if (body.bungalow !== undefined) {
      patch.bungalow = String(body.bungalow).trim();
    }
    if (body.streetName !== undefined || body.street_name !== undefined) {
      patch.street_name = String(body.streetName ?? body.street_name ?? "").trim();
    }
    if (body.landmark !== undefined) {
      patch.landmark = String(body.landmark).trim();
    }
    if (body.postalCode !== undefined || body.pincode !== undefined) {
      patch.pincode = String(body.pincode ?? body.postalCode ?? "").trim();
    }
    if (body.city !== undefined) patch.city = String(body.city).trim();
    if (body.state !== undefined) patch.state = String(body.state).trim();
    if (body.country !== undefined) {
      patch.country_name = String(body.country).trim();
    }
    if (body.countryId !== undefined) {
      patch.country_id =
        body.countryId == null ? null : Number(body.countryId) || null;
    }
    if (body.stateId !== undefined) {
      patch.state_id =
        body.stateId == null ? null : Number(body.stateId) || null;
    }
    if (body.cityId !== undefined) {
      patch.city_id =
        body.cityId == null ? null : Number(body.cityId) || null;
    }
    if (body.userId !== undefined || body.user_id !== undefined) {
      const uid = body.userId ?? body.user_id;
      patch.user_id = uid == null ? null : Number(uid) || null;
    }
    if (body.packTitle !== undefined) {
      patch.pack_title = String(body.packTitle).trim();
    }
    if (body.qty !== undefined) patch.qty = Math.max(1, toNumber(body.qty, 1));
    if (body.subtotal !== undefined) patch.subtotal = toNumber(body.subtotal, 0);
    if (body.discount !== undefined) patch.discount = toNumber(body.discount, 0);
    if (body.total !== undefined || body.amount !== undefined) {
      patch.amount = toNumber(body.amount ?? body.total, 0);
    }
    if (
      body.deliveryCharges !== undefined ||
      body.delivery_charges !== undefined
    ) {
      patch.delivery_charges = toNumber(
        body.deliveryCharges ?? body.delivery_charges,
        0,
      );
    }
    if (
      body.paymentMethod !== undefined ||
      body.payment_method !== undefined
    ) {
      patch.payment_method = String(
        body.paymentMethod ?? body.payment_method ?? "",
      ).trim();
    }
    if (body.coupon !== undefined) {
      patch.coupon = body.coupon ? String(body.coupon).trim() : null;
    }
    if (body.productTitle !== undefined) {
      patch.product_title = String(body.productTitle).trim();
    }
    if (body.productId !== undefined || body.productSlug !== undefined) {
      const slug = String(body.productSlug ?? body.productId ?? "").trim();
      patch.product_slug = slug || null;
      if (slug) {
        const { data } = await supabase
          .from("products")
          .select("product_id")
          .eq("slug", slug)
          .maybeSingle();
        patch.product_id =
          data?.product_id != null ? Number(data.product_id) : null;
      }
    }
    if (body.cardId !== undefined || body.card_id !== undefined) {
      const cid = body.cardId ?? body.card_id;
      patch.card_id = cid == null ? null : Number(cid) || null;
    }
    if (body.cardSlug !== undefined) {
      patch.card_slug = body.cardSlug ? String(body.cardSlug).trim() : null;
    }
    if (body.cardUrl !== undefined) {
      patch.card_url = body.cardUrl ? String(body.cardUrl).trim() : null;
    }
    if (body.cardHidden !== undefined) {
      const hidden =
        body.cardHidden === true || Number(body.cardHidden) === 1;
      patch.card_hidden = hidden ? 1 : 0;
      if (hidden) {
        patch.card_slug = null;
        patch.card_url = null;
        const existingDesign = sanitizeCardDesignForDb(
          (existing.card_design as OrderCardDesignData | null) ?? null,
        );
        patch.card_design = {
          ...(existingDesign ?? {}),
          dashboardHidden: true,
        };
      }
    }
    if (body.jobTitle !== undefined || body.designation !== undefined) {
      patch.designation = String(
        body.designation ?? body.jobTitle ?? "",
      ).trim();
    }
    if (body.companyName !== undefined) {
      patch.company_name = String(body.companyName).trim();
    }
    if (body.businessName !== undefined) {
      patch.business_name = String(body.businessName).trim();
    }
    if (body.reviewLink !== undefined) {
      patch.review_link = body.reviewLink
        ? String(body.reviewLink).trim()
        : null;
    }
    if (body.orderLogoSrc !== undefined || body.logo !== undefined) {
      const logo = body.logo ?? body.orderLogoSrc;
      patch.logo = logo ? orderLogoColumnValue(String(logo)) : null;
    }
    if (body.cardDesign !== undefined) {
      let incoming = body.cardDesign;
      const logo = incoming?.logoSrc?.trim();
      if (logo?.startsWith("data:image/")) {
        try {
          const saved = await saveCardImage({
            username: sanitizeCardUsername(
              String(existing.order_code || body.id || ""),
            ),
            kind: "order-logo",
            dataUrl: logo,
          });
          incoming = { ...incoming, logoSrc: saved.path };
          patch.logo = orderLogoColumnValue(saved.filename);
        } catch (err) {
          console.error("[orders] Logo upload on update failed:", err);
        }
      }
      patch.card_design = mergeCardDesignForDb(
        (existing.card_design as OrderCardDesignData | null) ?? null,
        incoming,
      );
    }
    if (body.status !== undefined) patch.status = statusToDb(body.status);
    if (body.paymentStatus !== undefined) {
      patch.payment_status = paymentToDb(body.paymentStatus);
    }
    if (body.paymentMethod !== undefined || body.payment_method !== undefined) {
      patch.payment_method = String(
        body.paymentMethod ?? body.payment_method ?? "",
      ).trim();
    }
    if (body.nimbusPushed !== undefined) {
      patch.nimbus_pushed =
        body.nimbusPushed === true || Number(body.nimbusPushed) === 1 ? 1 : 0;
    }
    if (body.awbNumber !== undefined) {
      patch.awb_number = body.awbNumber
        ? String(body.awbNumber).trim()
        : null;
    }
    if (body.courierName !== undefined) {
      patch.courier_name = body.courierName
        ? String(body.courierName).trim()
        : null;
    }
    if (body.shipmentCreatedAt !== undefined) {
      patch.shipment_created_at = body.shipmentCreatedAt || null;
    }

    if (Object.keys(patch).length === 0) {
      return jsonError(400, "No fields to update");
    }

    const { data, error } = await supabase
      .from("orders")
      .update(patch)
      .eq("order_id", existing.order_id)
      .select("*")
      .maybeSingle();

    if (error) return jsonError(500, "Failed to update order", error.message);
    if (!data) return jsonError(404, "Order not found");

    const updated = data as OrderRow;
    if (
      patch.qty !== undefined ||
      patch.amount !== undefined ||
      patch.subtotal !== undefined ||
      patch.product_id !== undefined ||
      patch.product_slug !== undefined ||
      patch.product_title !== undefined ||
      patch.pack_title !== undefined
    ) {
      await syncOrderItems(supabase, updated);
    }

    return jsonOk(mapOrder(updated));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const supabase = getSupabaseAdmin();
    const existing = await findOrder(supabase, id);
    if (!existing) return jsonError(404, "Order not found");

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("order_id", existing.order_id);

    if (error) return jsonError(500, "Failed to delete order", error.message);
    return jsonOk({ deleted: existing.order_code, orderId: existing.order_id });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
