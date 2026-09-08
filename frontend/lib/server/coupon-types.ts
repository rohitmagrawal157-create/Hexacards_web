export type CouponRow = {
  coupon_id: number | string;
  name: string;
  code: string;
  percent_off: number | string;
  active: number | boolean | null;
  created_at: string;
  updated_at?: string | null;
};

export type CouponDto = {
  id: number;
  name: string;
  code: string;
  percentOff: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type CouponWriteBody = {
  name?: string;
  code?: string;
  percentOff?: number;
  percent_off?: number;
  active?: boolean | number;
};

export const COUPON_COLS =
  "coupon_id, name, code, percent_off, active, created_at, updated_at" as const;

export function mapCoupon(row: CouponRow): CouponDto {
  return {
    id: Number(row.coupon_id),
    name: String(row.name ?? "").trim(),
    code: String(row.code ?? "").trim().toUpperCase(),
    percentOff: Math.min(100, Math.max(1, Number(row.percent_off) || 0)),
    active: row.active === true || Number(row.active) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

/** Build a unique-looking uppercase code from the coupon name. */
export function generateCouponCode(name: string): string {
  const base =
    String(name || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 6) || "HEXA";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`.slice(0, 14);
}

export function normalizeCouponCode(code: string): string {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}
