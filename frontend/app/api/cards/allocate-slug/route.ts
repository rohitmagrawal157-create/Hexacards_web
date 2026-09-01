import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { allocateCardSlugForName } from "@/lib/server/card-slug";

/**
 * POST /api/cards/allocate-slug
 * Body: { name: string }
 * Returns a unique public slug — e.g. ramesh-tupe, ramesh-tupe2, …
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = String(body.name ?? "").trim();
    if (!name) return jsonError(400, "name is required");

    const supabase = getSupabaseAdmin();
    const slug = await allocateCardSlugForName(supabase, name);
    return jsonOk({ slug });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
