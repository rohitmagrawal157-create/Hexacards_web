/** Supabase `reviews` table */
export type ReviewRow = {
  review_id: number | string;
  user_id: number | string | null;
  product_id: number | string | null;
  review_text: string;
  rating_value: number;
  created_at: string;
  updated_at: string;
};

export type ReviewDto = {
  reviewId: number;
  userId: number | null;
  productId: number | null;
  reviewText: string;
  ratingValue: number;
  createdAt: string;
  updatedAt: string;
};

export type ReviewWriteBody = {
  userId?: number | null;
  user_id?: number | null;
  productId?: number | null;
  product_id?: number | null;
  productSlug?: string | null;
  reviewText?: string;
  review_text?: string;
  ratingValue?: number;
  rating_value?: number;
  ownerPhone?: string;
};

export function mapReview(row: ReviewRow): ReviewDto {
  return {
    reviewId: Number(row.review_id),
    userId: row.user_id == null ? null : Number(row.user_id),
    productId: row.product_id == null ? null : Number(row.product_id),
    reviewText: row.review_text ?? "",
    ratingValue: Number(row.rating_value) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const REVIEW_COLS =
  "review_id, user_id, product_id, review_text, rating_value, created_at, updated_at" as const;
