import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ProductRow, ProductWriteBody } from "@/lib/server/catalog-types";
import {
  buildProductPayload,
  jsonError,
  jsonOk,
  mapProduct,
  resolveCategoryRef,
  slugify,
  uniqueId,
} from "@/lib/admin-catalog-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const active = searchParams.get("active");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("product_name", { ascending: true });

    if (categoryId) {
      const category = await resolveCategoryRef(supabase, categoryId);
      if (!category) {
        return jsonError(400, `Unknown categoryId "${categoryId}"`);
      }
      query = query.eq("product_category", category.category_id);
    }
    if (active === "true") query = query.eq("active", true);
    if (active === "false") query = query.eq("active", false);

    const [{ data, error }, { data: cats }] = await Promise.all([
      query,
      supabase.from("categories").select("category_id, slug"),
    ]);
    if (error) return jsonError(500, "Failed to load products", error.message);

    const slugById = new Map(
      ((cats as { category_id: number; slug: string }[] | null) ?? []).map(
        (c) => [Number(c.category_id), c.slug] as const,
      ),
    );

    return jsonOk(
      ((data as ProductRow[] | null) ?? []).map((row) =>
        mapProduct(
          row,
          slugById.get(Number(row.product_category)) ?? null,
        ),
      ),
    );
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ProductWriteBody;
    const title = String(
      body.title ?? body.productName ?? body.product_name ?? "",
    ).trim();
    if (!title) return jsonError(400, "title is required");

    const supabase = getSupabaseAdmin();
    const categoryRef =
      body.categoryId ?? body.category_id ?? body.product_category ?? null;

    if (categoryRef === null || categoryRef === undefined || categoryRef === "") {
      return jsonError(400, "categoryId is required");
    }

    const category = await resolveCategoryRef(supabase, categoryRef);
    if (!category) {
      return jsonError(400, `Unknown categoryId "${categoryRef}"`);
    }

    if (!body.category) body.category = category.category_name;

    const { data: existing } = await supabase.from("products").select("slug");
    const existingSlugs = new Set((existing ?? []).map((r) => String(r.slug)));
    const slug =
      String(body.slug ?? body.id ?? "").trim() ||
      uniqueId(
        slugify(String(body.shortTitle ?? body.short_title ?? title)),
        existingSlugs,
      );

    if (existingSlugs.has(slug)) {
      return jsonError(409, `Product slug "${slug}" already exists`);
    }

    const payload: Record<string, unknown> = {
      slug,
      ...buildProductPayload(body, { forCreate: true }),
      product_category: Number(category.category_id),
      category: body.category,
    };

    if (!payload.cta_href) payload.cta_href = `/product/${slug}`;
    if (payload.sort_order === 0) payload.sort_order = existingSlugs.size;

    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select("*")
      .single();

    if (error) return jsonError(500, "Failed to create product", error.message);
    return jsonOk(mapProduct(data as ProductRow, category.slug), 201);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
