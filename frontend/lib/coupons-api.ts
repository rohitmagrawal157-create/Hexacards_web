import { apiFetch } from "@/lib/api-config";
import {
  generateCouponCode as genCode,
  type CouponDto,
} from "@/lib/server/coupon-types";

export type AdminCoupon = CouponDto;

export { genCode as generateCouponCode };

export async function fetchCoupons(opts?: {
  activeOnly?: boolean;
}): Promise<AdminCoupon[]> {
  const qs = opts?.activeOnly ? "?active=1" : "";
  const res = await apiFetch<AdminCoupon[]>(`/api/coupons${qs}`);
  if (!res.ok || !Array.isArray(res.data)) {
    throw new Error(res.error || "Failed to load coupons");
  }
  return res.data;
}

export async function lookupCouponByCode(
  code: string,
): Promise<AdminCoupon | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const res = await apiFetch<AdminCoupon>(
    `/api/coupons?code=${encodeURIComponent(trimmed)}&active=1`,
  );
  if (!res.ok || !res.data) return null;
  return res.data;
}

export async function createCoupon(input: {
  name: string;
  code?: string;
  percentOff: number;
  active?: boolean;
}): Promise<AdminCoupon> {
  const res = await apiFetch<AdminCoupon>("/api/coupons", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      code: input.code,
      percentOff: input.percentOff,
      active: input.active ?? true,
    }),
  });
  if (!res.ok || !res.data) {
    throw new Error(res.error || "Failed to create coupon");
  }
  return res.data;
}

export async function updateCoupon(
  id: number,
  patch: Partial<{
    name: string;
    code: string;
    percentOff: number;
    active: boolean;
  }>,
): Promise<AdminCoupon> {
  const res = await apiFetch<AdminCoupon>(`/api/coupons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!res.ok || !res.data) {
    throw new Error(res.error || "Failed to update coupon");
  }
  return res.data;
}

export async function deleteCoupon(id: number): Promise<void> {
  const res = await apiFetch<{ deleted: boolean }>(`/api/coupons/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(res.error || "Failed to delete coupon");
  }
}
