import {
  productCatalog,
  type CatalogProduct,
  type ProductMedia,
} from "@/lib/product-catalog";
import type { ProductDto } from "@/lib/server/catalog-types";

export type ApiProductShape = {
  id: string;
  category: string;
  title: string;
  shortTitle: string;
  description: string;
  price: number;
  compareAtPrice: number;
  media: ProductMedia[];
  highlights: string[];
  finishes: { name: string; hint: string }[];
  included: string[];
  ctaLabel: string;
  ctaHref: string;
  designable: boolean;
  imageSrc?: string | null;
  active?: boolean;
};

export function mergeApiProductToCatalog(row: ApiProductShape): CatalogProduct {
  const base = productCatalog[row.id];
  const media =
    Array.isArray(row.media) && row.media.length > 0
      ? row.media
      : row.imageSrc
        ? [{ type: "image" as const, src: row.imageSrc, alt: row.shortTitle }]
        : (base?.media ?? []);

  return {
    ...(base ?? {
      id: row.id,
      category: row.category,
      title: row.title,
      shortTitle: row.shortTitle,
      description: row.description,
      price: 0,
      compareAtPrice: 0,
      media: [],
      highlights: [],
      finishes: [],
      included: [],
      ctaLabel: "Order Now",
      ctaHref: `/product/${row.id}`,
      designable: false,
    }),
    id: row.id,
    category: row.category?.trim() || base?.category || "General",
    title: row.title?.trim() || base?.title || "",
    shortTitle: row.shortTitle?.trim() || base?.shortTitle || row.title || "",
    description: row.description ?? base?.description ?? "",
    price: Number(row.price) || 0,
    compareAtPrice: Number(row.compareAtPrice) || 0,
    media,
    highlights:
      row.highlights?.length > 0 ? row.highlights : (base?.highlights ?? []),
    finishes: row.finishes?.length > 0 ? row.finishes : (base?.finishes ?? []),
    included: row.included?.length > 0 ? row.included : (base?.included ?? []),
    ctaLabel: row.ctaLabel?.trim() || base?.ctaLabel || "Order Now",
    ctaHref: row.ctaHref?.trim() || base?.ctaHref || `/product/${row.id}`,
    designable: row.designable ?? base?.designable ?? false,
  };
}

export function mergeProductDtoToCatalog(dto: ProductDto): CatalogProduct {
  return mergeApiProductToCatalog({
    id: dto.id,
    category: dto.category,
    title: dto.title,
    shortTitle: dto.shortTitle,
    description: dto.description,
    price: dto.price,
    compareAtPrice: dto.compareAtPrice,
    media: dto.media,
    highlights: dto.highlights,
    finishes: dto.finishes,
    included: dto.included,
    ctaLabel: dto.ctaLabel,
    ctaHref: dto.ctaHref,
    designable: dto.designable,
    imageSrc: dto.imageSrc,
    active: dto.active,
  });
}

export function dtoToApiProductShape(dto: ProductDto): ApiProductShape {
  return {
    id: dto.id,
    category: dto.category,
    title: dto.title,
    shortTitle: dto.shortTitle,
    description: dto.description,
    price: dto.price,
    compareAtPrice: dto.compareAtPrice,
    media: dto.media,
    highlights: dto.highlights,
    finishes: dto.finishes,
    included: dto.included,
    ctaLabel: dto.ctaLabel,
    ctaHref: dto.ctaHref,
    designable: dto.designable,
    imageSrc: dto.imageSrc,
    active: dto.active,
  };
}

export function buildCatalogFromApiRows(
  rows: ApiProductShape[],
): Record<string, CatalogProduct> {
  const catalog: Record<string, CatalogProduct> = { ...productCatalog };
  for (const row of rows) {
    if (!row?.id || row.active === false) continue;
    catalog[row.id] = mergeApiProductToCatalog(row);
  }
  return catalog;
}
