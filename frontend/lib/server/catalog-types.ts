import type { ProductMedia, ProductFinish } from "@/lib/product-catalog";

/** Supabase `categories` table row */
export type CategoryRow = {
  id: string;
  title: string;
  subtitle: string | null;
  image_src: string | null;
  sort_order: number | null;
  created_at?: string;
  updated_at?: string;
};

/** Supabase `products` table row */
export type ProductRow = {
  id: string;
  category_id: string | null;
  category: string;
  title: string;
  short_title: string;
  description: string | null;
  price: number | string | null;
  compare_at_price: number | string | null;
  media: ProductMedia[] | null;
  highlights: string[] | null;
  finishes: ProductFinish[] | null;
  included: string[] | null;
  cta_label: string | null;
  cta_href: string | null;
  designable: boolean | null;
  image_src: string | null;
  sort_order: number | null;
  active: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type CategoryDto = {
  id: string;
  title: string;
  subtitle: string;
  imageSrc: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductDto = {
  id: string;
  categoryId: string | null;
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
  title?: string;
  subtitle?: string;
  imageSrc?: string | null;
  sortOrder?: number;
};

export type CategoryUpdateBody = {
  title?: string;
  subtitle?: string;
  imageSrc?: string | null;
  sortOrder?: number;
};

export type ProductWriteBody = {
  id?: string;
  title?: string;
  shortTitle?: string;
  short_title?: string;
  category?: string;
  categoryId?: string | null;
  category_id?: string | null;
  description?: string;
  price?: number;
  compareAtPrice?: number;
  compare_at_price?: number;
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
  image_src?: string | null;
};

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: string; details?: string };
