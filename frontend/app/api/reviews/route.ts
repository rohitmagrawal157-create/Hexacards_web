import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  mapReview,
  REVIEW_COLS,
  type ReviewRow,
  type ReviewWriteBody,
} from "@/lib/server/review-types";

async function resolveUserId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  body: ReviewWriteBody,
): Promise<number | null> {
  const explicit = Number(body.userId ?? body.user_id);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;
  const phone = String(body.ownerPhone ?? "")
    .replace(/\D/g, "")
    .slice(-10);
  if (!phone) return null;
  const { data } = await supabase
    .from("users")
    .select("user_id")
    .eq("mobile", phone)
    .maybeSingle();
  return data?.user_id != null ? Number(data.user_id) : null;
}

async function resolveProductId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  body: ReviewWriteBody,
): Promise<number | null> {
  const explicit = Number(body.productId ?? body.product_id);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;
  const slug = String(body.productSlug ?? "").trim();
  if (!slug) return null;
  const { data } = await supabase
    .from("products")
    .select("product_id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.product_id != null ? Number(data.product_id) : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const userId = searchParams.get("user_id");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("reviews")
      .select(REVIEW_COLS)
      .order("review_id", { ascending: false });

    if (productId) {
      const id = Number(productId);
      if (!Number.isInteger(id) || id <= 0) {
        return jsonError(400, "product_id must be a positive integer");
      }
      query = query.eq("product_id", id);
    }
    if (userId) {
      const id = Number(userId);
      if (!Number.isInteger(id) || id <= 0) {
        return jsonError(400, "user_id must be a positive integer");
      }
      query = query.eq("user_id", id);
    }

    const { data, error } = await query;
    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("schema cache")
      ) {
        return jsonError(
          400,
          "reviews table missing — run frontend/sql/reviews-table.sql",
        );
      }
      return jsonError(500, "Failed to load reviews", error.message);
    }

    return jsonOk((data as ReviewRow[] | null ?? []).map(mapReview));
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ReviewWriteBody;
    const reviewText = String(
      body.reviewText ?? body.review_text ?? "",
    ).trim();
    const rating = Number(body.ratingValue ?? body.rating_value ?? 0);

    if (!reviewText) return jsonError(400, "review_text is required");
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return jsonError(400, "rating_value must be between 0 and 5");
    }

    const supabase = getSupabaseAdmin();
    const [userId, productId] = await Promise.all([
      resolveUserId(supabase, body),
      resolveProductId(supabase, body),
    ]);

    if (!productId) {
      return jsonError(400, "product_id or productSlug is required");
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: userId,
        product_id: productId,
        review_text: reviewText,
        rating_value: Math.round(rating),
      })
      .select(REVIEW_COLS)
      .single();

    if (error) {
      if (error.code === "23503") {
        return jsonError(400, "Invalid user_id or product_id");
      }
      return jsonError(500, "Failed to create review", error.message);
    }

    return jsonOk(mapReview(data as ReviewRow), 201);
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
