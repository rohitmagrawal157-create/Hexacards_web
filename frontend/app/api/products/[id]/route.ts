import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ProductRow, ProductWriteBody } from "@/lib/server/catalog-types";
import {
  buildProductPayload,
  jsonError,
  jsonOk,
  mapProduct,
  resolveCategoryRef,
  resolveProductRef,
} from "@/lib/admin-catalog-db";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function slugForProduct(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  row: ProductRow,
): Promise<string | null> {
  const category = await resolveCategoryRef(supabase, row.product_category);
  return category?.slug ?? null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const supabase = getSupabaseAdmin();
    const row = await resolveProductRef(supabase, id);

    if (!row) return jsonError(404, "Product not found");
    return jsonOk(mapProduct(row, await slugForProduct(supabase, row)));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const body = (await request.json().catch(() => ({}))) as ProductWriteBody;
    const supabase = getSupabaseAdmin();
    const existing = await resolveProductRef(supabase, id);
    if (!existing) return jsonError(404, "Product not found");

    const patch = buildProductPayload(body, { forCreate: false });

    let categorySlug: string | null | undefined;

    if (
      body.categoryId !== undefined ||
      body.category_id !== undefined ||
      body.product_category !== undefined
    ) {
      const ref =
        body.categoryId ?? body.category_id ?? body.product_category ?? null;
      if (ref === null || ref === "") {
        return jsonError(400, "product_category cannot be empty");
      }
      const category = await resolveCategoryRef(supabase, ref);
      if (!category) {
        return jsonError(400, `Unknown categoryId "${String(ref)}"`);
      }
      patch.product_category = Number(category.category_id);
      categorySlug = category.slug;
      if (body.category === undefined) {
        patch.category = category.category_name;
      }
    }

    if (body.slug !== undefined) {
      const slug = String(body.slug).trim();
      if (!slug) return jsonError(400, "slug cannot be empty");
      patch.slug = slug;
    }

    if (Object.keys(patch).length === 0) {
      return jsonError(400, "No fields to update");
    }

    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("product_id", existing.product_id)
      .select("*")
      .maybeSingle();

    if (error) return jsonError(500, "Failed to update product", error.message);
    if (!data) return jsonError(404, "Product not found");
    const row = data as ProductRow;
    const slug =
      categorySlug !== undefined
        ? categorySlug
        : await slugForProduct(supabase, row);
    return jsonOk(mapProduct(row, slug));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const supabase = getSupabaseAdmin();
    const existing = await resolveProductRef(supabase, id);
    if (!existing) return jsonError(404, "Product not found");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("product_id", existing.product_id);

    if (error) return jsonError(500, "Failed to delete product", error.message);
    return jsonOk({ deleted: existing.slug, productId: existing.product_id });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
