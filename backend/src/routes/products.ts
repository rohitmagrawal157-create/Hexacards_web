import { Router, type Request, type Response } from "express";
import { supabase } from "../supabase.js";
import {
  asMedia,
  asStringArray,
  mapProduct,
  sendError,
  slugify,
  toNumber,
  uniqueId,
  type ProductRow,
} from "../utils.js";

const router = Router();

function buildProductPayload(
  body: Record<string, unknown>,
  { forCreate = false }: { forCreate?: boolean } = {},
): Record<string, unknown> {
  const title = String(body.title ?? "").trim();
  const shortTitle = String(body.shortTitle ?? body.short_title ?? title).trim();
  const imageSrc =
    body.imageSrc !== undefined
      ? String(body.imageSrc ?? "").trim() || null
      : body.image_src !== undefined
        ? String(body.image_src ?? "").trim() || null
        : undefined;

  const payload: Record<string, unknown> = {};

  if (forCreate || body.title !== undefined) payload.title = title;
  if (forCreate || body.shortTitle !== undefined || body.short_title !== undefined) {
    payload.short_title = shortTitle || title;
  }
  if (forCreate || body.category !== undefined) {
    payload.category = String(body.category ?? "General").trim() || "General";
  }
  if (forCreate || body.categoryId !== undefined || body.category_id !== undefined) {
    payload.category_id =
      body.categoryId !== undefined
        ? body.categoryId || null
        : body.category_id !== undefined
          ? body.category_id || null
          : null;
  }
  if (forCreate || body.description !== undefined) {
    payload.description = String(body.description ?? "").trim();
  }
  if (forCreate || body.price !== undefined) payload.price = toNumber(body.price, 0);
  if (
    forCreate ||
    body.compareAtPrice !== undefined ||
    body.compare_at_price !== undefined
  ) {
    payload.compare_at_price = toNumber(
      body.compareAtPrice ?? body.compare_at_price,
      0,
    );
  }
  if (forCreate || body.ctaLabel !== undefined || body.cta_label !== undefined) {
    payload.cta_label =
      String(body.ctaLabel ?? body.cta_label ?? "Order Now").trim() || "Order Now";
  }
  if (forCreate || body.ctaHref !== undefined || body.cta_href !== undefined) {
    payload.cta_href = String(body.ctaHref ?? body.cta_href ?? "").trim();
  }
  if (forCreate || body.designable !== undefined) {
    payload.designable = Boolean(body.designable);
  }
  if (forCreate || body.active !== undefined) {
    payload.active = body.active === undefined ? true : Boolean(body.active);
  }
  if (forCreate || body.sortOrder !== undefined || body.sort_order !== undefined) {
    payload.sort_order = toNumber(body.sortOrder ?? body.sort_order, 0);
  }
  if (forCreate || body.highlights !== undefined) {
    payload.highlights = asStringArray(body.highlights);
  }
  if (forCreate || body.finishes !== undefined) {
    payload.finishes = Array.isArray(body.finishes) ? body.finishes : [];
  }
  if (forCreate || body.included !== undefined) {
    payload.included = asStringArray(body.included);
  }
  if (forCreate || body.media !== undefined || imageSrc !== undefined) {
    payload.media = asMedia(body.media, imageSrc, shortTitle || title || "Product");
  }
  if (imageSrc !== undefined) payload.image_src = imageSrc;

  return payload;
}

router.get("/", async (req: Request, res: Response) => {
  let query = supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (req.query.categoryId) {
    query = query.eq("category_id", String(req.query.categoryId));
  }
  if (req.query.active === "true") query = query.eq("active", true);
  if (req.query.active === "false") query = query.eq("active", false);

  const { data, error } = await query;
  if (error) return sendError(res, 500, "Failed to load products", error.message);
  return res.json({
    ok: true,
    data: ((data as ProductRow[] | null) ?? []).map(mapProduct),
  });
});

router.get("/by-category", async (_req: Request, res: Response) => {
  const [{ data: categories, error: catErr }, { data: products, error: prodErr }] =
    await Promise.all([
      supabase.from("categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("products").select("*").order("sort_order", { ascending: true }),
    ]);

  if (catErr) return sendError(res, 500, "Failed to load categories", catErr.message);
  if (prodErr) return sendError(res, 500, "Failed to load products", prodErr.message);

  const grouped: Record<string, ReturnType<typeof mapProduct>[]> = {};
  for (const cat of categories ?? []) {
    grouped[String(cat.id)] = [];
  }
  for (const product of (products as ProductRow[] | null) ?? []) {
    const key = product.category_id || "_uncategorized";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(mapProduct(product));
  }

  return res.json({
    ok: true,
    data: {
      categories: (categories ?? []).map((c) => ({
        id: String(c.id),
        title: String(c.title),
        subtitle: String(c.subtitle ?? ""),
        imageSrc: (c.image_src as string | null) ?? null,
        sortOrder: Number(c.sort_order) || 0,
      })),
      productsByCategory: grouped,
    },
  });
});

router.get("/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) return sendError(res, 500, "Failed to load product", error.message);
  if (!data) return sendError(res, 404, "Product not found");
  return res.json({ ok: true, data: mapProduct(data as ProductRow) });
});

router.post("/", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return sendError(res, 400, "title is required");

  const categoryId = (body.categoryId ?? body.category_id ?? null) as string | null;
  if (categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("id, title")
      .eq("id", categoryId)
      .maybeSingle();
    if (!category) return sendError(res, 400, `Unknown categoryId "${categoryId}"`);
    if (!body.category) body.category = category.title;
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
    return sendError(res, 409, `Product id "${id}" already exists`);
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

  if (error) return sendError(res, 500, "Failed to create product", error.message);
  return res.status(201).json({ ok: true, data: mapProduct(data as ProductRow) });
});

router.put("/:id", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch = buildProductPayload(body, { forCreate: false });

  if (Object.keys(patch).length === 0) {
    return sendError(res, 400, "No fields to update");
  }

  if (patch.category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("id, title")
      .eq("id", String(patch.category_id))
      .maybeSingle();
    if (!category) {
      return sendError(res, 400, `Unknown categoryId "${String(patch.category_id)}"`);
    }
    if (body.category === undefined) patch.category = category.title;
  }

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) return sendError(res, 500, "Failed to update product", error.message);
  if (!data) return sendError(res, 404, "Product not found");
  return res.json({ ok: true, data: mapProduct(data as ProductRow) });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", req.params.id);

  if (error) return sendError(res, 500, "Failed to delete product", error.message);
  return res.json({ ok: true, deleted: req.params.id });
});

export default router;
