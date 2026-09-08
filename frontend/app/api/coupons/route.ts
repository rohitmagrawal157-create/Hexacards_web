import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  COUPON_COLS,
  generateCouponCode,
  mapCoupon,
  normalizeCouponCode,
  type CouponRow,
  type CouponWriteBody,
} from "@/lib/server/coupon-types";

export const runtime = "nodejs";

/**
 * GET /api/coupons
 * Query: ?code=WELCOME10 (lookup one), ?active=1 (active only)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = normalizeCouponCode(searchParams.get("code") || "");
    const activeOnly =
      searchParams.get("active") === "1" ||
      searchParams.get("active") === "true";

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("coupons")
      .select(COUPON_COLS)
      .order("coupon_id", { ascending: false });

    if (code) {
      query = query.ilike("code", code);
    }
    if (activeOnly) {
      query = query.eq("active", 1);
    }

    const { data, error } = await query;
    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "coupons table missing — run frontend/sql/coupons-table.sql",
        );
      }
      return jsonError(500, "Failed to load coupons", error.message);
    }

    const rows = (data as CouponRow[] | null ?? []).map(mapCoupon);
    if (code) {
      const match = rows[0] ?? null;
      if (!match) return jsonError(404, "Coupon not found");
      if (activeOnly && !match.active) {
        return jsonError(404, "Coupon is inactive");
      }
      return jsonOk(match);
    }

    return jsonOk(rows);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CouponWriteBody;
    const name = String(body.name ?? "").trim();
    if (!name) return jsonError(400, "Coupon name is required");

    const percentOff = Number(body.percentOff ?? body.percent_off);
    if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
      return jsonError(400, "Percentage must be between 1 and 100");
    }

    let code = normalizeCouponCode(String(body.code ?? ""));
    if (!code) code = generateCouponCode(name);
    if (code.length < 4) {
      return jsonError(400, "Coupon code must be at least 4 characters");
    }

    const active =
      body.active === undefined
        ? 1
        : body.active === true || Number(body.active) === 1
          ? 1
          : 0;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        name,
        code,
        percent_off: Math.round(percentOff),
        active,
      })
      .select(COUPON_COLS)
      .single();

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        return jsonError(409, `Coupon code "${code}" already exists`);
      }
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "coupons table missing — run frontend/sql/coupons-table.sql",
        );
      }
      return jsonError(500, "Failed to create coupon", error.message);
    }

    return jsonOk(mapCoupon(data as CouponRow), 201);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
