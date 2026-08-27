import type { ProductMedia, ProductFinish } from "@/lib/product-catalog";

/** Supabase `categories` table row */
export type CategoryRow = {
  category_id: number | string;
  category_name: string;
  category_desc: string | null;
  category_img: string | null;
  slug: string;
  sort_order: number | null;
  status: number | null;
  created_at?: string;
  updated_at?: string;
};

/** Supabase `products` table row */
export type ProductRow = {
  product_id: number | string;
  product_name: string;
  product_category: number | string;
  product_desc: string | null;
  product_img: string | null;
  product_price: number | string | null;
  regular_price: number | string | null;
  slug: string;
  short_title: string;
  category: string;
  media: ProductMedia[] | null;
  highlights: string[] | null;
  finishes: ProductFinish[] | null;
  included: string[] | null;
  cta_label: string | null;
  cta_href: string | null;
  designable: boolean | null;
  sort_order: number | null;
  active: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type CategoryDto = {
  /** URL / admin section key (slug) — kept as `id` for frontend compatibility */
  id: string;
  categoryId: number;
  title: string;
  subtitle: string;
  imageSrc: string | null;
  sortOrder: number;
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductDto = {
  /** URL / catalog key (slug) — kept as `id` for frontend compatibility */
  id: string;
  productId: number;
  /** Numeric FK to categories.category_id */
  categoryId: number;
  /** Category slug for admin grouping / filters */
  categorySlug: string | null;
  category: string;
  title: string;
  shortTitle: string;
  description: string;
  price: number;
  compareAtPrice: number;
  media: ProductMedia[];
  highlights: string[];
  finishes: ProductFinish[];
  included: string[];
  ctaLabel: string;
  ctaHref: string;
  designable: boolean;
  imageSrc: string | null;
  sortOrder: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryCreateBody = {
  id?: string;
  slug?: string;
  title?: string;
  categoryName?: string;
  category_name?: string;
  subtitle?: string;
  categoryDesc?: string;
  category_desc?: string;
  imageSrc?: string | null;
  categoryImg?: string | null;
  category_img?: string | null;
  sortOrder?: number;
  status?: boolean | number;
};

export type CategoryUpdateBody = {
  title?: string;
  categoryName?: string;
  category_name?: string;
  subtitle?: string;
  categoryDesc?: string;
  category_desc?: string;
  imageSrc?: string | null;
  categoryImg?: string | null;
  category_img?: string | null;
  sortOrder?: number;
  status?: boolean | number;
  slug?: string;
};

export type ProductWriteBody = {
  id?: string;
  slug?: string;
  title?: string;
  productName?: string;
  product_name?: string;
  shortTitle?: string;
  short_title?: string;
  category?: string;
  categoryId?: string | number | null;
  category_id?: string | number | null;
  product_category?: string | number | null;
  description?: string;
  productDesc?: string;
  product_desc?: string;
  price?: number;
  productPrice?: number;
  product_price?: number;
  compareAtPrice?: number;
  compare_at_price?: number;
  regularPrice?: number;
  regular_price?: number;
  ctaLabel?: string;
  cta_label?: string;
  ctaHref?: string;
  cta_href?: string;
  designable?: boolean;
  active?: boolean;
  sortOrder?: number;
  sort_order?: number;
  highlights?: string[];
  finishes?: ProductFinish[];
  included?: string[];
  media?: ProductMedia[];
  imageSrc?: string | null;
  productImg?: string | null;
  product_img?: string | null;
  image_src?: string | null;
};

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: string; details?: string };
