import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { productCatalog, type CatalogProduct } from "@/lib/product-catalog";

const DEFAULT_CATEGORIES = [
  {
    id: "business-card",
    title: "Business Card",
    subtitle: "NFC, PVC, and metal card products.",
    image_src: "/Images/Products/digitalCard.jpg",
    sort_order: 1,
  },
  {
    id: "digital-profile-qr",
    title: "Digital Profile + QR",
    subtitle: "Print-ready QR cards that open your digital profile instantly.",
    image_src: "/Images/Products/digitalQR.jpg",
    sort_order: 2,
  },
  {
    id: "social-media-card",
    title: "Social Media Card",
    subtitle: "Google review, Instagram, YouTube, and keychain QR cards.",
    image_src: "/Images/Products/googleReview.jpg",
    sort_order: 3,
  },
  {
    id: "standee",
    title: "Standee",
    subtitle: "Google, Instagram, and YouTube review standees.",
    image_src: "/Images/Products/reviewStandy.jpg",
    sort_order: 4,
  },
] as const;

/** Which category each product belongs to in Super Admin */
const PRODUCT_CATEGORY_MAP: Record<string, string> = {
  "nfc-business-card": "business-card",
  "pvc-card": "business-card",
  "metal-card": "business-card",
  "digital-profile-qr": "digital-profile-qr",
  "google-review-card": "social-media-card",
  "instagram-card": "social-media-card",
  "youtube-card": "social-media-card",
  "review-keychain-qr": "social-media-card",
  "social-media-cards": "social-media-card",
  "google-reviews": "social-media-card",
  "google-standee": "standee",
  "instagram-standee": "standee",
  "youtube-standee": "standee",
  "review-stand": "standee",
};

/** Products shown in the Super Admin catalog (matches UI screenshots) */
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

function toProductRow(product: CatalogProduct, sortOrder: number) {
  const categoryId = PRODUCT_CATEGORY_MAP[product.id] ?? null;
  const categoryMeta = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);

  return {
    id: product.id,
    category_id: categoryId,
    category: categoryMeta?.title ?? product.category,
    title: product.title,
    short_title: product.shortTitle,
    description: product.description,
    price: product.price,
    compare_at_price: product.compareAtPrice,
    media: product.media,
    highlights: product.highlights,
    finishes: product.finishes,
    included: product.included,
    cta_label: product.ctaLabel,
    cta_href: product.ctaHref,
    designable: product.designable,
    image_src: primaryImage(product),
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

    const probe = await supabase.from("categories").select("id").limit(1);
    if (probe.error) {
      return NextResponse.json(
        {
          ok: false,
          error: probe.error.message,
          hint: "Run frontend/sql/schema.sql in Supabase SQL Editor first.",
        },
        { status: 400 },
      );
    }

    const { data: categories, error: catErr } = await supabase
      .from("categories")
      .upsert([...DEFAULT_CATEGORIES], { onConflict: "id" })
      .select("id,title");

    if (catErr) {
      return NextResponse.json(
        { ok: false, error: catErr.message, step: "categories" },
        { status: 500 },
      );
    }

    const productRows = SEED_PRODUCT_IDS.map((id, index) => {
      const product = productCatalog[id];
      if (!product) return null;
      return toProductRow(product, index + 1);
    }).filter((row): row is NonNullable<typeof row> => Boolean(row));

    const { data: products, error: prodErr } = await supabase
      .from("products")
      .upsert(productRows, { onConflict: "id" })
      .select("id,short_title,category_id,price,compare_at_price");

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
