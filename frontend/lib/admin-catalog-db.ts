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
    String(fallbackImage || "").trim() || "/Images/Products/digitalCard.jpeg";
  return [{ type: "image", src, alt }];
}

/** Public folder for category/product images (filename only stored in DB). */
export const CATALOG_IMG_DIR = "/Images/Products/";
/** @deprecated use CATALOG_IMG_DIR */
export const CATEGORY_IMG_DIR = CATALOG_IMG_DIR;

/** Landing / catalog hero images refreshed Sep 2026. */
const PRODUCT_HERO_IMAGE_ALIASES: Record<string, string> = {
  "digitalcard.jpg": "digitalCard.jpeg",
  "digitalcard.png": "digitalCard.jpeg",
  "digitalcard.jpeg": "digitalCard.jpeg",
  "digitalqr.jpg": "DigitalprofileQr.jpeg",
  "digitalqr.png": "DigitalprofileQr.jpeg",
  "digitalqr.jpeg": "DigitalprofileQr.jpeg",
  "qr.png": "DigitalprofileQr.jpeg",
  "digitalprofileqr.jpeg": "DigitalprofileQr.jpeg",
  "digitalprofileqr.jpg": "DigitalprofileQr.jpeg",
  "googlereview.jpg": "googleReview.jpeg",
  "googlereview.png": "googleReview.jpeg",
  "googlereview.jpeg": "googleReview.jpeg",
  "reviewstandy.jpg": "reviewStandy.jpeg",
  "reviewstandy.png": "reviewStandy.jpeg",
  "reviewstandy.jpeg": "reviewStandy.jpeg",
};

function resolveProductHeroFilename(filename: string): string {
  const base = filename.split("?")[0]?.trim() || filename;
  const aliased = PRODUCT_HERO_IMAGE_ALIASES[base.toLowerCase()];
  return aliased || base;
}

/** Persist only the file name (strip folders / query). */
export function toCatalogImgFilename(
  value: string | null | undefined,
): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const path = new URL(raw).pathname;
      const base = path.split("/").filter(Boolean).pop() ?? "";
      return base || null;
    }
  } catch {
    // fall through
  }
  const base = raw.split(/[\\/]/).pop()?.split("?")[0]?.trim() ?? "";
  return base || null;
}

/** @deprecated use toCatalogImgFilename */
export const toCategoryImgFilename = toCatalogImgFilename;

/** Build browser URL from stored filename (or pass through absolute/data URLs). */
export function catalogImgPublicUrl(
  stored: string | null | undefined,
): string | null {
  const raw = String(stored ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("data:") || /^https?:\/\//i.test(raw)) {
    return raw;
  }
  if (raw.startsWith("/")) {
    const base = raw.split("/").filter(Boolean).pop() || "";
    if (base && PRODUCT_HERO_IMAGE_ALIASES[base.toLowerCase()]) {
      return `${CATALOG_IMG_DIR}${resolveProductHeroFilename(base)}`;
    }
    return raw;
  }
  return `${CATALOG_IMG_DIR}${resolveProductHeroFilename(raw)}`;
}

/** @deprecated use catalogImgPublicUrl */
export const categoryImgPublicUrl = catalogImgPublicUrl;

export function mapCategory(row: CategoryRow): CategoryDto {
  return {
    id: row.slug,
    categoryId: Number(row.category_id),
    title: row.category_name,
    subtitle: row.category_desc ?? "",
    imageSrc: catalogImgPublicUrl(row.category_img),
    sortOrder: Number(row.sort_order) || 0,
    status: Number(row.status ?? 1) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProduct(
  row: ProductRow,
  categorySlug?: string | null,
): ProductDto {
  return {
    id: row.slug,
    productId: Number(row.product_id),
    categoryId: Number(row.product_category),
    categorySlug: categorySlug ?? null,
    category: row.category,
    title: row.product_name,
    shortTitle: row.short_title || row.product_name,
    description: row.product_desc ?? "",
    price: Number(row.product_price) || 0,
    compareAtPrice: Number(row.regular_price) || 0,
    media: row.media ?? [],
    highlights: row.highlights ?? [],
    finishes: row.finishes ?? [],
    included: row.included ?? [],
    ctaLabel: row.cta_label ?? "Order Now",
    ctaHref: row.cta_href ?? "",
    designable: Boolean(row.designable),
    imageSrc: catalogImgPublicUrl(row.product_img),
    sortOrder: Number(row.sort_order) || 0,
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Resolve category by numeric id or slug (admin section id). */
export async function resolveCategoryRef(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  ref: string | number | null | undefined,
): Promise<CategoryRow | null> {
  if (ref === null || ref === undefined || ref === "") return null;
  const raw = String(ref).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("category_id", Number(raw))
      .maybeSingle();
    if (data) return data as CategoryRow;
  }

  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", raw)
    .maybeSingle();
  return (data as CategoryRow | null) ?? null;
}

/** Resolve product by numeric product_id or slug. */
export async function resolveProductRef(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  ref: string | number | null | undefined,
): Promise<ProductRow | null> {
  if (ref === null || ref === undefined || ref === "") return null;
  const raw = String(ref).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", Number(raw))
      .maybeSingle();
    if (data) return data as ProductRow;
  }

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("slug", raw)
    .maybeSingle();
  return (data as ProductRow | null) ?? null;
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
  const title = String(
    body.title ?? body.productName ?? body.product_name ?? "",
  ).trim();
  const shortTitle = String(body.shortTitle ?? body.short_title ?? title).trim();
  const imageRaw =
    body.imageSrc !== undefined
      ? body.imageSrc
      : body.productImg !== undefined
        ? body.productImg
        : body.product_img !== undefined
          ? body.product_img
          : body.image_src !== undefined
            ? body.image_src
            : undefined;
  const imageFile =
    imageRaw === undefined
      ? undefined
      : toCatalogImgFilename(
          imageRaw == null ? null : String(imageRaw),
        );

  const payload: Record<string, unknown> = {};

  if (forCreate || body.title !== undefined || body.productName !== undefined || body.product_name !== undefined) {
    payload.product_name = title;
  }
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
    body.description !== undefined ||
    body.productDesc !== undefined ||
    body.product_desc !== undefined
  ) {
    payload.product_desc = String(
      body.description ?? body.productDesc ?? body.product_desc ?? "",
    ).trim();
  }
  if (
    forCreate ||
    body.price !== undefined ||
    body.productPrice !== undefined ||
    body.product_price !== undefined
  ) {
    payload.product_price = toNumber(
      body.price ?? body.productPrice ?? body.product_price,
      0,
    );
  }
  if (
    forCreate ||
    body.compareAtPrice !== undefined ||
    body.compare_at_price !== undefined ||
    body.regularPrice !== undefined ||
    body.regular_price !== undefined
  ) {
    payload.regular_price = toNumber(
      body.compareAtPrice ??
        body.compare_at_price ??
        body.regularPrice ??
        body.regular_price,
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
  if (forCreate || body.media !== undefined || imageFile !== undefined) {
    payload.media = asMedia(
      body.media,
      imageFile ? catalogImgPublicUrl(imageFile) : null,
      shortTitle || title || "Product",
    );
  }
  if (imageFile !== undefined) payload.product_img = imageFile;

  return payload;
}
