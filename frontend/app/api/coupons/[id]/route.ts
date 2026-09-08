import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  COUPON_COLS,
  mapCoupon,
  normalizeCouponCode,
  type CouponRow,
  type CouponWriteBody,
} from "@/lib/server/coupon-types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return jsonError(400, "Invalid coupon id");
    }

    const body = (await request.json().catch(() => ({}))) as CouponWriteBody;
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return jsonError(400, "Coupon name cannot be empty");
      patch.name = name;
    }
    if (body.code !== undefined) {
      const code = normalizeCouponCode(String(body.code));
      if (code.length < 4) {
        return jsonError(400, "Coupon code must be at least 4 characters");
      }
      patch.code = code;
    }
    if (body.percentOff !== undefined || body.percent_off !== undefined) {
      const percentOff = Number(body.percentOff ?? body.percent_off);
      if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
        return jsonError(400, "Percentage must be between 1 and 100");
      }
      patch.percent_off = Math.round(percentOff);
    }
    if (body.active !== undefined) {
      patch.active =
        body.active === true || Number(body.active) === 1 ? 1 : 0;
    }

    if (Object.keys(patch).length <= 1) {
      return jsonError(400, "No fields to update");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("coupons")
      .update(patch)
      .eq("coupon_id", id)
      .select(COUPON_COLS)
      .maybeSingle();

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        return jsonError(409, "Coupon code already exists");
      }
      return jsonError(500, "Failed to update coupon", error.message);
    }
    if (!data) return jsonError(404, "Coupon not found");

    return jsonOk(mapCoupon(data as CouponRow));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return jsonError(400, "Invalid coupon id");
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("coupon_id", id);

    if (error) {
      return jsonError(500, "Failed to delete coupon", error.message);
    }

    return jsonOk({ deleted: true, id });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
