import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  CategoryRow,
  CategoryUpdateBody,
} from "@/lib/server/catalog-types";
import {
  jsonError,
  jsonOk,
  mapCategory,
  toNumber,
} from "@/lib/admin-catalog-db";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return jsonError(500, "Failed to load category", error.message);
    if (!data) return jsonError(404, "Category not found");
    return jsonOk(mapCategory(data as CategoryRow));
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
    const patch: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonError(400, "title cannot be empty");
      patch.title = title;
    }
    if (body.subtitle !== undefined) {
      patch.subtitle = String(body.subtitle).trim();
    }
    if (body.imageSrc !== undefined) {
      patch.image_src = body.imageSrc ? String(body.imageSrc).trim() : null;
    }
    if (body.sortOrder !== undefined) {
      patch.sort_order = toNumber(body.sortOrder, 0);
    }

    if (Object.keys(patch).length === 0) {
      return jsonError(400, "No fields to update");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("categories")
      .update(patch)
      .eq("id", id)
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
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) return jsonError(500, "Failed to delete category", error.message);
    return jsonOk({ deleted: id });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
