import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  CategoryRow,
  CategoryUpdateBody,
} from "@/lib/server/catalog-types";
import {
  jsonError,
  jsonOk,
  mapCategory,
  resolveCategoryRef,
  slugify,
  toCategoryImgFilename,
  toNumber,
} from "@/lib/admin-catalog-db";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const supabase = getSupabaseAdmin();
    const data = await resolveCategoryRef(supabase, id);

    if (!data) return jsonError(404, "Category not found");
    return jsonOk(mapCategory(data));
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
    const body = (await request.json().catch(() => ({}))) as CategoryUpdateBody;
    const supabase = getSupabaseAdmin();
    const existing = await resolveCategoryRef(supabase, id);
    if (!existing) return jsonError(404, "Category not found");

    const patch: Record<string, unknown> = {};

    const name =
      body.title ?? body.categoryName ?? body.category_name;
    if (name !== undefined) {
      const title = String(name).trim();
      if (!title) return jsonError(400, "title cannot be empty");
      patch.category_name = title;
    }

    const desc =
      body.subtitle ?? body.categoryDesc ?? body.category_desc;
    if (desc !== undefined) {
      patch.category_desc = String(desc).trim() || null;
    }

    if (body.imageSrc !== undefined) {
      patch.category_img = toCategoryImgFilename(body.imageSrc);
    } else if (
      body.categoryImg !== undefined ||
      body.category_img !== undefined
    ) {
      const img = body.categoryImg ?? body.category_img;
      patch.category_img = toCategoryImgFilename(
        img == null ? null : String(img),
      );
    }

    if (body.sortOrder !== undefined) {
      patch.sort_order = toNumber(body.sortOrder, 0);
    }

    if (body.slug !== undefined) {
      const slug = String(body.slug).trim() || slugify(String(name ?? ""));
      if (!slug) return jsonError(400, "slug cannot be empty");
      patch.slug = slug;
    }

    if (body.status !== undefined) {
      patch.status =
        typeof body.status === "boolean"
          ? body.status
            ? 1
            : 0
          : Number(body.status) === 0
            ? 0
            : 1;
    }

    if (Object.keys(patch).length === 0) {
      return jsonError(400, "No fields to update");
    }

    const { data, error } = await supabase
      .from("categories")
      .update(patch)
      .eq("category_id", existing.category_id)
      .select("*")
      .maybeSingle();

    if (error) return jsonError(500, "Failed to update category", error.message);
    if (!data) return jsonError(404, "Category not found");
    return jsonOk(mapCategory(data as CategoryRow));
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
    const existing = await resolveCategoryRef(supabase, id);
    if (!existing) return jsonError(404, "Category not found");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("category_id", existing.category_id);

    if (error) return jsonError(500, "Failed to delete category", error.message);
    return jsonOk({ deleted: existing.slug, categoryId: existing.category_id });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
