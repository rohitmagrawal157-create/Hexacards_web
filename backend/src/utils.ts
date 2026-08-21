import type { Response } from "express";

export type CategoryRow = {
  id: string;
  title: string;
  subtitle: string | null;
  image_src: string | null;
  sort_order: number | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductRow = {
  id: string;
  category_id: string | null;
  category: string;
  title: string;
  short_title: string;
  description: string | null;
  price: number | string | null;
  compare_at_price: number | string | null;
  media: unknown;
  highlights: unknown;
  finishes: unknown;
  included: unknown;
  cta_label: string | null;
  cta_href: string | null;
  designable: boolean | null;
  image_src: string | null;
  sort_order: number | null;
  active: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export function slugify(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function uniqueId(base: string, existingIds: Set<string>): string {
  let id = base || `item-${Date.now()}`;
  if (!existingIds.has(id)) return id;
  let n = 2;
  while (existingIds.has(`${id}-${n}`)) n += 1;
  return `${id}-${n}`;
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

export function asMedia(
  value: unknown,
  fallbackImage: string | null | undefined,
  alt = "Product",
) {
  if (Array.isArray(value) && value.length > 0) return value;
  const src =
    String(fallbackImage || "").trim() || "/Images/Products/digitalCard.jpg";
  return [{ type: "image", src, alt }];
}

export function mapCategory(row: CategoryRow) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    imageSrc: row.image_src ?? null,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProduct(row: ProductRow) {
  return {
    id: row.id,
    categoryId: row.category_id ?? null,
    category: row.category,
    title: row.title,
    shortTitle: row.short_title,
    description: row.description ?? "",
    price: Number(row.price) || 0,
    compareAtPrice: Number(row.compare_at_price) || 0,
    media: Array.isArray(row.media) ? row.media : [],
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    finishes: Array.isArray(row.finishes) ? row.finishes : [],
    included: Array.isArray(row.included) ? row.included : [],
    ctaLabel: row.cta_label ?? "Order Now",
    ctaHref: row.cta_href ?? "",
    designable: Boolean(row.designable),
    imageSrc: row.image_src ?? null,
    sortOrder: Number(row.sort_order) || 0,
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  details?: string,
) {
  return res.status(status).json({
    ok: false,
    error: message,
    ...(details ? { details } : {}),
  });
}
