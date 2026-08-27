import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CategoryCreateBody, CategoryRow } from "@/lib/server/catalog-types";
import {
  jsonError,
  jsonOk,
  mapCategory,
  slugify,
  toCategoryImgFilename,
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
      .order("category_name", { ascending: true });

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
    const title = String(
      body.title ?? body.categoryName ?? body.category_name ?? "",
    ).trim();
    if (!title) return jsonError(400, "title is required");

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase.from("categories").select("slug");
    const existingSlugs = new Set(
      (existing ?? []).map((r) => String(r.slug)),
    );
    const slug =
      String(body.slug ?? body.id ?? "").trim() ||
      uniqueId(slugify(title), existingSlugs);

    if (existingSlugs.has(slug)) {
      return jsonError(409, `Category slug "${slug}" already exists`);
    }

    const image =
      body.imageSrc !== undefined
        ? toCategoryImgFilename(body.imageSrc)
        : body.categoryImg !== undefined || body.category_img !== undefined
          ? toCategoryImgFilename(
              String(body.categoryImg ?? body.category_img ?? ""),
            )
          : null;

    const desc = String(
      body.subtitle ?? body.categoryDesc ?? body.category_desc ?? "",
    ).trim();

    const statusRaw = body.status;
    const status =
      statusRaw === undefined
        ? 1
        : typeof statusRaw === "boolean"
          ? statusRaw
            ? 1
            : 0
          : Number(statusRaw) === 0
            ? 0
            : 1;

    const payload = {
      category_name: title,
      category_desc: desc || null,
      category_img: image,
      slug,
      sort_order: toNumber(body.sortOrder, existingSlugs.size),
      status,
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
