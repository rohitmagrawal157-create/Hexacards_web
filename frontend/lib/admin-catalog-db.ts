import { NextResponse } from "next/server";
import type { ProductMedia } from "@/lib/product-catalog";
import type {
  CategoryDto,
  CategoryRow,
  ProductDto,
  ProductRow,
  ProductWriteBody,
} from "@/lib/server/catalog-types";

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
): ProductMedia[] {
  if (Array.isArray(value) && value.length > 0) {
    return value as ProductMedia[];
  }
  const src =
    String(fallbackImage || "").trim() || "/Images/Products/digitalCard.jpg";
  return [{ type: "image", src, alt }];
}

export function mapCategory(row: CategoryRow): CategoryDto {
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

export function mapProduct(row: ProductRow): ProductDto {
  return {
    id: row.id,
    categoryId: row.category_id ?? null,
    category: row.category,
    title: row.title,
    shortTitle: row.short_title,
    description: row.description ?? "",
    price: Number(row.price) || 0,
    compareAtPrice: Number(row.compare_at_price) || 0,
    media: row.media ?? [],
    highlights: row.highlights ?? [],
    finishes: row.finishes ?? [],
    included: row.included ?? [],
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

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true as const, data }, { status });
}

export function jsonError(status: number, error: string, details?: string) {
  return NextResponse.json(
    { ok: false as const, error, ...(details ? { details } : {}) },
    { status },
  );
}

export function buildProductPayload(
  body: ProductWriteBody,
  { forCreate = false }: { forCreate?: boolean } = {},
): Record<string, unknown> {
  const title = String(body.title ?? "").trim();
  const shortTitle = String(body.shortTitle ?? body.short_title ?? title).trim();
  const imageSrc =
    body.imageSrc !== undefined
      ? String(body.imageSrc ?? "").trim() || null
      : body.image_src !== undefined
        ? String(body.image_src ?? "").trim() || null
        : undefined;

  const payload: Record<string, unknown> = {};

  if (forCreate || body.title !== undefined) payload.title = title;
  if (
    forCreate ||
    body.shortTitle !== undefined ||
    body.short_title !== undefined
  ) {
    payload.short_title = shortTitle || title;
  }
  if (forCreate || body.category !== undefined) {
    payload.category = String(body.category ?? "General").trim() || "General";
  }
  if (
    forCreate ||
    body.categoryId !== undefined ||
    body.category_id !== undefined
  ) {
    payload.category_id =
      body.categoryId !== undefined
        ? body.categoryId || null
        : body.category_id !== undefined
          ? body.category_id || null
          : null;
  }
  if (forCreate || body.description !== undefined) {
    payload.description = String(body.description ?? "").trim();
  }
  if (forCreate || body.price !== undefined) {
    payload.price = toNumber(body.price, 0);
  }
  if (
    forCreate ||
    body.compareAtPrice !== undefined ||
    body.compare_at_price !== undefined
  ) {
    payload.compare_at_price = toNumber(
      body.compareAtPrice ?? body.compare_at_price,
      0,
    );
  }
  if (
    forCreate ||
    body.ctaLabel !== undefined ||
    body.cta_label !== undefined
  ) {
    payload.cta_label =
      String(body.ctaLabel ?? body.cta_label ?? "Order Now").trim() ||
      "Order Now";
  }
  if (forCreate || body.ctaHref !== undefined || body.cta_href !== undefined) {
    payload.cta_href = String(body.ctaHref ?? body.cta_href ?? "").trim();
  }
  if (forCreate || body.designable !== undefined) {
    payload.designable = Boolean(body.designable);
  }
  if (forCreate || body.active !== undefined) {
    payload.active = body.active === undefined ? true : Boolean(body.active);
  }
  if (
    forCreate ||
    body.sortOrder !== undefined ||
    body.sort_order !== undefined
  ) {
    payload.sort_order = toNumber(body.sortOrder ?? body.sort_order, 0);
  }
  if (forCreate || body.highlights !== undefined) {
    payload.highlights = asStringArray(body.highlights);
  }
  if (forCreate || body.finishes !== undefined) {
    payload.finishes = Array.isArray(body.finishes) ? body.finishes : [];
  }
  if (forCreate || body.included !== undefined) {
    payload.included = asStringArray(body.included);
  }
  if (forCreate || body.media !== undefined || imageSrc !== undefined) {
    payload.media = asMedia(
      body.media,
      imageSrc,
      shortTitle || title || "Product",
    );
  }
  if (imageSrc !== undefined) payload.image_src = imageSrc;

  return payload;
}
