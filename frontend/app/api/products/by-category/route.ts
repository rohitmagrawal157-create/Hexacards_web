import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CategoryRow, ProductDto, ProductRow } from "@/lib/server/catalog-types";
import { jsonError, jsonOk, mapProduct } from "@/lib/admin-catalog-db";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [
      { data: categories, error: catErr },
      { data: products, error: prodErr },
    ] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    if (catErr) return jsonError(500, "Failed to load categories", catErr.message);
    if (prodErr) return jsonError(500, "Failed to load products", prodErr.message);

    const grouped: Record<string, ProductDto[]> = {};
    for (const cat of (categories as CategoryRow[] | null) ?? []) {
      grouped[cat.id] = [];
    }
    for (const product of (products as ProductRow[] | null) ?? []) {
      const key = product.category_id || "_uncategorized";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(mapProduct(product));
    }

    return jsonOk({
      categories: ((categories as CategoryRow[] | null) ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: c.subtitle ?? "",
        imageSrc: c.image_src ?? null,
        sortOrder: Number(c.sort_order) || 0,
      })),
      productsByCategory: grouped,
    });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
