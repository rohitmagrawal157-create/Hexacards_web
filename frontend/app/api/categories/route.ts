import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CategoryCreateBody, CategoryRow } from "@/lib/server/catalog-types";
import {
  jsonError,
  jsonOk,
  mapCategory,
  slugify,
  toNumber,
  uniqueId,
} from "@/lib/admin-catalog-db";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (error) return jsonError(500, "Failed to load categories", error.message);
    return jsonOk((data as CategoryRow[] | null ?? []).map(mapCategory));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CategoryCreateBody;
    const title = String(body.title ?? "").trim();
    if (!title) return jsonError(400, "title is required");

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase.from("categories").select("id");
    const existingIds = new Set((existing ?? []).map((r) => String(r.id)));
    const id =
      String(body.id ?? "").trim() || uniqueId(slugify(title), existingIds);

    if (existingIds.has(id)) {
      return jsonError(409, `Category id "${id}" already exists`);
    }

    const payload = {
      id,
      title,
      subtitle: String(body.subtitle ?? "").trim(),
      image_src: body.imageSrc ? String(body.imageSrc).trim() : null,
      sort_order: toNumber(body.sortOrder, existingIds.size),
    };

    const { data, error } = await supabase
      .from("categories")
      .insert(payload)
      .select("*")
      .single();

    if (error) return jsonError(500, "Failed to create category", error.message);
    return jsonOk(mapCategory(data as CategoryRow), 201);
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
