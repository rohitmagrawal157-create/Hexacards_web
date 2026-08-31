import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { productCatalog, type CatalogProduct } from "@/lib/product-catalog";
import { toCatalogImgFilename } from "@/lib/admin-catalog-db";

const DEFAULT_CATEGORIES = [
  {
    category_id: 1,
    slug: "business-card",
    category_name: "Business Card",
    category_desc: "NFC, PVC, and metal card products.",
    category_img: "digitalCard.jpg",
    sort_order: 1,
    status: 1,
  },
  {
    category_id: 2,
    slug: "digital-profile-qr",
    category_name: "Digital Profile + QR",
    category_desc:
      "Print-ready QR cards that open your digital profile instantly.",
    category_img: "digitalQR.jpg",
    sort_order: 2,
    status: 1,
  },
  {
    category_id: 3,
    slug: "social-media-card",
    category_name: "Social Media Card",
    category_desc: "Google review, Instagram, and YouTube social cards.",
    category_img: "googleReview.jpg",
    sort_order: 3,
    status: 1,
  },
  {
    category_id: 4,
    slug: "standee",
    category_name: "Standee",
    category_desc: "Google, Instagram, and YouTube review standees.",
    category_img: "reviewStandy.jpg",
    sort_order: 4,
    status: 1,
  },
  // {
  //   category_id: 5,
  //   slug: "review-keychain",
  //   category_name: "Review Keychain QR",
  //   category_desc: "NFC + QR keychains that open your Google review page.",
  //   category_img: "keychain-front-back.jpg",
  //   sort_order: 5,
  //   status: 1,
  // },
] as const;

/** Which category slug each product belongs to */
const PRODUCT_CATEGORY_MAP: Record<string, string> = {
  "nfc-business-card": "business-card",
  "pvc-card": "business-card",
  "metal-card": "business-card",
  "digital-profile-qr": "digital-profile-qr",
  "google-review-card": "social-media-card",
  "instagram-card": "social-media-card",
  "youtube-card": "social-media-card",
  "social-media-cards": "social-media-card",
  "google-reviews": "social-media-card",
  "google-standee": "standee",
  "instagram-standee": "standee",
  "youtube-standee": "standee",
  "review-stand": "standee",
  "review-keychain-qr": "review-keychain",
};

const SEED_PRODUCT_IDS = [
  "nfc-business-card",
  "pvc-card",
  "metal-card",
  "digital-profile-qr",
  "google-review-card",
  "instagram-card",
  "youtube-card",
  "review-keychain-qr",
  "google-standee",
  "instagram-standee",
  "youtube-standee",
] as const;

function primaryImage(product: CatalogProduct): string | null {
  const first = product.media[0];
  if (!first) return null;
  if (first.type === "image") return first.src;
  return first.thumbnail;
}

function toProductRow(
  product: CatalogProduct,
  sortOrder: number,
  categoryIdBySlug: Map<string, number>,
) {
  const catSlug = PRODUCT_CATEGORY_MAP[product.id] ?? "business-card";
  const categoryMeta = DEFAULT_CATEGORIES.find((c) => c.slug === catSlug);
  const categoryId = categoryIdBySlug.get(catSlug) ?? 1;

  return {
    slug: product.id,
    product_name: product.title,
    product_category: categoryId,
    product_desc: product.description,
    product_img: toCatalogImgFilename(primaryImage(product)),
    product_price: product.price,
    regular_price: product.compareAtPrice,
    short_title: product.shortTitle,
    category: categoryMeta?.category_name ?? product.category,
    media: product.media,
    highlights: product.highlights,
    finishes: product.finishes,
    included: product.included,
    cta_label: product.ctaLabel,
    cta_href: product.ctaHref,
    designable: product.designable,
    sort_order: sortOrder,
    active: true,
  };
}

/**
 * Seeds all HexaCards products + categories into Supabase.
 * POST /api/setup/seed
 */
export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    const probe = await supabase
      .from("categories")
      .select("category_id")
      .limit(1);
    if (probe.error) {
      return NextResponse.json(
        {
          ok: false,
          error: probe.error.message,
          hint:
            "Run frontend/sql/schema.sql (or categories-migrate.sql + products-migrate.sql) first.",
        },
        { status: 400 },
      );
    }

    const productsProbe = await supabase
      .from("products")
      .select("product_id")
      .limit(1);
    if (productsProbe.error) {
      return NextResponse.json(
        {
          ok: false,
          error: productsProbe.error.message,
          hint: "Run frontend/sql/products-migrate.sql in Supabase SQL Editor.",
        },
        { status: 400 },
      );
    }

    const { data: categories, error: catErr } = await supabase
      .from("categories")
      .upsert([...DEFAULT_CATEGORIES], { onConflict: "category_id" })
      .select("category_id, slug, category_name");

    if (catErr) {
      return NextResponse.json(
        { ok: false, error: catErr.message, step: "categories" },
        { status: 500 },
      );
    }

    const categoryIdBySlug = new Map(
      ((categories as { category_id: number; slug: string }[] | null) ?? []).map(
        (c) => [c.slug, Number(c.category_id)] as const,
      ),
    );
    for (const c of DEFAULT_CATEGORIES) {
      if (!categoryIdBySlug.has(c.slug)) {
        categoryIdBySlug.set(c.slug, c.category_id);
      }
    }

    const productRows = SEED_PRODUCT_IDS.map((id, index) => {
      const product = productCatalog[id];
      if (!product) return null;
      return toProductRow(product, index + 1, categoryIdBySlug);
    }).filter((row): row is NonNullable<typeof row> => Boolean(row));

    const { data: products, error: prodErr } = await supabase
      .from("products")
      .upsert(productRows, { onConflict: "slug" })
      .select("product_id, slug, short_title, product_category, product_price, regular_price");

    if (prodErr) {
      return NextResponse.json(
        { ok: false, error: prodErr.message, step: "products" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      categories: categories?.length ?? 0,
      products: products?.length ?? 0,
      data: {
        categories,
        products,
      },
      next: "Refresh Super Admin → Products to see Supabase data.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Server error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage: "POST /api/setup/seed — upserts all catalog products into Supabase",
    productIds: SEED_PRODUCT_IDS,
  });
}
