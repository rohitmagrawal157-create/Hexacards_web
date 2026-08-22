import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ProductRow, ProductWriteBody } from "@/lib/server/catalog-types";
import {
  buildProductPayload,
  jsonError,
  jsonOk,
  mapProduct,
} from "@/lib/admin-catalog-db";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return jsonError(500, "Failed to load product", error.message);
    if (!data) return jsonError(404, "Product not found");
    return jsonOk(mapProduct(data as ProductRow));
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
    const patch = buildProductPayload(body, { forCreate: false });

    if (Object.keys(patch).length === 0) {
      return jsonError(400, "No fields to update");
    }

    const supabase = getSupabaseAdmin();

    if (patch.category_id) {
      const { data: category } = await supabase
        .from("categories")
        .select("id, title")
        .eq("id", String(patch.category_id))
        .maybeSingle();
      if (!category) {
        return jsonError(
          400,
          `Unknown categoryId "${String(patch.category_id)}"`,
        );
      }
      if (body.category === undefined) patch.category = category.title;
    }

    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) return jsonError(500, "Failed to update product", error.message);
    if (!data) return jsonError(404, "Product not found");
    return jsonOk(mapProduct(data as ProductRow));
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
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) return jsonError(500, "Failed to delete product", error.message);
    return jsonOk({ deleted: id });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
