import { mapProduct, resolveProductRef } from "@/lib/admin-catalog-db";
import {
  buildCatalogFromApiRows,
  dtoToApiProductShape,
  mergeProductDtoToCatalog,
} from "@/lib/product-merge";
import { productCatalog, type CatalogProduct } from "@/lib/product-catalog";
import type { ProductDto, ProductRow } from "@/lib/server/catalog-types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

async function categorySlugForProduct(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  row: ProductRow,
): Promise<string | null> {
  const { data } = await supabase
    .from("categories")
    .select("slug")
    .eq("category_id", row.product_category)
    .maybeSingle();
  return data?.slug != null ? String(data.slug) : null;
}

function staticFallback(id: string): CatalogProduct {
  return productCatalog[id] ?? productCatalog["nfc-business-card"];
}

/** Server-side product load for product detail pages (correct price on first paint). */
export async function getPublicProductServer(
  id: string,
): Promise<CatalogProduct> {
  const slug = String(id ?? "").trim();
  if (!slug) return staticFallback("nfc-business-card");

  try {
    const supabase = getSupabaseAdmin();
    const row = await resolveProductRef(supabase, slug);
    if (!row || row.active === false) return staticFallback(slug);

    const dto = mapProduct(row, await categorySlugForProduct(supabase, row));
    return mergeProductDtoToCatalog(dto);
  } catch {
    return staticFallback(slug);
  }
}

/** All active products merged over static defaults — for /products grid SSR. */
export async function getPublicProductsCatalogServer(): Promise<
  Record<string, CatalogProduct>
> {
  try {
    const supabase = getSupabaseAdmin();
    const [{ data, error }, { data: cats }] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("categories").select("category_id, slug"),
    ]);

    if (error || !data?.length) return { ...productCatalog };

    const slugById = new Map(
      ((cats as { category_id: number; slug: string }[] | null) ?? []).map(
        (c) => [Number(c.category_id), c.slug] as const,
      ),
    );

    const rows = (data as ProductRow[]).map((row) => {
      const dto = mapProduct(
        row,
        slugById.get(Number(row.product_category)) ?? null,
      );
      return dtoToApiProductShape(dto);
    });

    return buildCatalogFromApiRows(rows);
  } catch {
    return { ...productCatalog };
  }
}

export type { ProductDto };
