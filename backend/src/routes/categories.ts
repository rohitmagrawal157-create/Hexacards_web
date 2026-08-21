import { Router, type Request, type Response } from "express";
import { supabase } from "../supabase.js";
import {
  mapCategory,
  sendError,
  slugify,
  toNumber,
  uniqueId,
  type CategoryRow,
} from "../utils.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) return sendError(res, 500, "Failed to load categories", error.message);
  return res.json({
    ok: true,
    data: ((data as CategoryRow[] | null) ?? []).map(mapCategory),
  });
});

router.get("/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) return sendError(res, 500, "Failed to load category", error.message);
  if (!data) return sendError(res, 404, "Category not found");
  return res.json({ ok: true, data: mapCategory(data as CategoryRow) });
});

router.post("/", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return sendError(res, 400, "title is required");

  const { data: existing } = await supabase.from("categories").select("id");
  const existingIds = new Set((existing ?? []).map((r) => String(r.id)));
  const id =
    String(body.id ?? "").trim() || uniqueId(slugify(title), existingIds);

  if (existingIds.has(id)) {
    return sendError(res, 409, `Category id "${id}" already exists`);
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

  if (error) return sendError(res, 500, "Failed to create category", error.message);
  return res.status(201).json({ ok: true, data: mapCategory(data as CategoryRow) });
});

router.put("/:id", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return sendError(res, 400, "title cannot be empty");
    patch.title = title;
  }
  if (body.subtitle !== undefined) patch.subtitle = String(body.subtitle).trim();
  if (body.imageSrc !== undefined) {
    patch.image_src = body.imageSrc ? String(body.imageSrc).trim() : null;
  }
  if (body.sortOrder !== undefined) patch.sort_order = toNumber(body.sortOrder, 0);

  if (Object.keys(patch).length === 0) {
    return sendError(res, 400, "No fields to update");
  }

  const { data, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) return sendError(res, 500, "Failed to update category", error.message);
  if (!data) return sendError(res, 404, "Category not found");
  return res.json({ ok: true, data: mapCategory(data as CategoryRow) });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", req.params.id);

  if (error) return sendError(res, 500, "Failed to delete category", error.message);
  return res.json({ ok: true, deleted: req.params.id });
});

export default router;
