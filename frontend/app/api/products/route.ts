import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ProductRow, ProductWriteBody } from "@/lib/server/catalog-types";
import {
  buildProductPayload,
  jsonError,
  jsonOk,
  mapProduct,
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
      .order("title", { ascending: true });

    if (categoryId) query = query.eq("category_id", categoryId);
    if (active === "true") query = query.eq("active", true);
    if (active === "false") query = query.eq("active", false);

    const { data, error } = await query;
    if (error) return jsonError(500, "Failed to load products", error.message);
    return jsonOk((data as ProductRow[] | null ?? []).map(mapProduct));
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
    const title = String(body.title ?? "").trim();
    if (!title) return jsonError(400, "title is required");

    const supabase = getSupabaseAdmin();
    const categoryId = body.categoryId ?? body.category_id ?? null;

    if (categoryId) {
      const { data: category } = await supabase
        .from("categories")
        .select("id, title")
        .eq("id", categoryId)
        .maybeSingle();
      if (!category) {
        return jsonError(400, `Unknown categoryId "${categoryId}"`);
      }
      if (!body.category) body.category = String(category.title);
    }

    const { data: existing } = await supabase.from("products").select("id");
    const existingIds = new Set((existing ?? []).map((r) => String(r.id)));
    const id =
      String(body.id ?? "").trim() ||
      uniqueId(
        slugify(String(body.shortTitle ?? body.short_title ?? title)),
        existingIds,
      );

    if (existingIds.has(id)) {
      return jsonError(409, `Product id "${id}" already exists`);
    }

    const payload: Record<string, unknown> = {
      id,
      ...buildProductPayload(body, { forCreate: true }),
    };

    if (!payload.cta_href) payload.cta_href = `/product/${id}`;
    if (payload.sort_order === 0) payload.sort_order = existingIds.size;

    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select("*")
      .single();

    if (error) return jsonError(500, "Failed to create product", error.message);
    return jsonOk(mapProduct(data as ProductRow), 201);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
