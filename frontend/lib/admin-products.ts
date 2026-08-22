import {
  productCatalog,
  type CatalogProduct,
  type ProductMedia,
} from "@/lib/product-catalog";
import { apiFetch } from "@/lib/api-config";

const ADMIN_STORE_KEY = "hexaAdminProductStore";
const ADMIN_PRODUCTS_CHANGE = "hexa-admin-products-change";
const LEGACY_CATALOG_KEY = "hexaAdminProducts";

export type AdminProductDraft = {
  title: string;
  shortTitle: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice: number;
  ctaLabel: string;
  ctaHref: string;
  /** Primary product image URL or data URL */
  imageSrc: string;
  /** Extra gallery images (URL or data URL) */
  additionalImages: string[];
  /** YouTube video id or full URL (optional) */
  videoYoutubeId: string;
  /** Optional video thumbnail (defaults to primary image) */
  videoThumbnail: string;
  /** Bullet / sub points (highlights) */
  highlights: string[];
};

export type AdminProductSection = {
  id: string;
  title: string;
  subtitle: string;
  /** Category / section image URL or data URL */
  imageSrc?: string;
};

type AdminStore = {
  catalog: Record<string, CatalogProduct>;
  sections: AdminProductSection[];
  /** sectionId -> ordered product ids */
  orders: Record<string, string[]>;
};

type ApiCategory = {
  id: string;
  title: string;
  subtitle: string;
  imageSrc?: string | null;
  sortOrder?: number;
};

type ApiProduct = {
  id: string;
  categoryId?: string | null;
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
  sortOrder?: number;
  active?: boolean;
};

const DEFAULT_SECTIONS: AdminProductSection[] = [
  {
    id: "business-card",
    title: "Business Card",
    subtitle: "NFC, PVC, and metal card products.",
    imageSrc: "/Images/Products/digitalCard.jpg",
  },
  {
    id: "digital-profile-qr",
    title: "Digital Profile + QR",
    subtitle: "Print-ready QR cards that open your digital profile instantly.",
    imageSrc: "/Images/Products/digitalQR.jpg",
  },
  {
    id: "social-media-card",
    title: "Social Media Card",
    subtitle: "Google review, Instagram, YouTube, and keychain QR cards.",
    imageSrc: "/Images/Products/googleReview.jpg",
  },
  {
    id: "standee",
    title: "Standee",
    subtitle: "Google, Instagram, and YouTube review standees.",
    imageSrc: "/Images/Products/reviewStandy.jpg",
  },
];

const SECTION_DISPLAY_ORDER = [
  "business-card",
  "digital-profile-qr",
  "social-media-card",
  "standee",
] as const;

const DEFAULT_ORDERS: Record<string, string[]> = {
  "business-card": ["nfc-business-card", "pvc-card", "metal-card"],
  "digital-profile-qr": ["digital-profile-qr"],
  standee: ["google-standee", "instagram-standee", "youtube-standee"],
  "social-media-card": [
    "google-review-card",
    "instagram-card",
    "youtube-card",
    "review-keychain-qr",
  ],
};

function normalizeSectionOrder(
  sections: AdminProductSection[],
): AdminProductSection[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const ordered: AdminProductSection[] = [];

  for (const id of SECTION_DISPLAY_ORDER) {
    const section = byId.get(id);
    if (section) {
      ordered.push(section);
      byId.delete(id);
    }
  }

  for (const section of sections) {
    if (byId.has(section.id)) {
      ordered.push(section);
      byId.delete(section.id);
    }
  }

  return ordered;
}

function cloneBaseCatalog(): Record<string, CatalogProduct> {
  return structuredClone(productCatalog);
}

function defaultStore(): AdminStore {
  return {
    catalog: cloneBaseCatalog(),
    sections: structuredClone(DEFAULT_SECTIONS),
    orders: structuredClone(DEFAULT_ORDERS),
  };
}

function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `item-${Date.now().toString(36)}`;
}

function uniqueId(preferred: string, existing: Set<string>): string {
  let id = preferred;
  let n = 2;
  while (existing.has(id)) {
    id = `${preferred}-${n}`;
    n += 1;
  }
  return id;
}

function notifyProductsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_PRODUCTS_CHANGE));
}

function mapApiCategory(row: ApiCategory): AdminProductSection {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    imageSrc: row.imageSrc || undefined,
  };
}

function mapApiProduct(row: ApiProduct): CatalogProduct {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    shortTitle: row.shortTitle,
    description: row.description ?? "",
    price: Number(row.price) || 0,
    compareAtPrice: Number(row.compareAtPrice) || 0,
    media: Array.isArray(row.media) ? row.media : [],
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    finishes: Array.isArray(row.finishes) ? row.finishes : [],
    included: Array.isArray(row.included) ? row.included : [],
    ctaLabel: row.ctaLabel || "Order Now",
    ctaHref: row.ctaHref || `/product/${row.id}`,
    designable: Boolean(row.designable),
  };
}

function draftToApiBody(draft: AdminProductDraft, categoryId?: string) {
  return {
    title: draft.title.trim(),
    shortTitle: draft.shortTitle.trim() || draft.title.trim(),
    category: draft.category.trim() || "General",
    categoryId: categoryId || undefined,
    description: draft.description.trim(),
    price: Number(draft.price) || 0,
    compareAtPrice: Number(draft.compareAtPrice) || 0,
    ctaLabel: draft.ctaLabel.trim() || "Order Now",
    ctaHref: draft.ctaHref.trim(),
    imageSrc: draft.imageSrc.trim() || undefined,
    highlights: draft.highlights.map((h) => h.trim()).filter(Boolean),
    media: buildMediaFromDraft(draft),
  };
}

/** Accepts a full YouTube URL or a bare 11-char id. */
export function parseYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace(/^\//, "").slice(0, 11);
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    const v = url.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const embed = url.pathname.match(/\/embed\/([\w-]{11})/);
    if (embed?.[1]) return embed[1];
    const shorts = url.pathname.match(/\/shorts\/([\w-]{11})/);
    if (shorts?.[1]) return shorts[1];
  } catch {
    // not a URL
  }
  return null;
}

export function buildMediaFromDraft(draft: AdminProductDraft): ProductMedia[] {
  const alt = draft.shortTitle.trim() || draft.title.trim() || "Product";
  const primary =
    draft.imageSrc.trim() || "/Images/Products/digitalCard.jpg";
  const media: ProductMedia[] = [
    {
      type: "image",
      src: primary,
      alt,
    },
  ];

  for (const src of draft.additionalImages) {
    const trimmed = src.trim();
    if (!trimmed || trimmed === primary) continue;
    media.push({
      type: "image",
      src: trimmed,
      alt: `${alt} — gallery`,
    });
  }

  const youtubeId = parseYoutubeId(draft.videoYoutubeId);
  if (youtubeId) {
    media.push({
      type: "video",
      youtubeId,
      thumbnail:
        draft.videoThumbnail.trim() ||
        primary ||
        `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      alt: `${alt} — video`,
    });
  }

  return media;
}

// ── Local fallback (used only if backend is unreachable) ────────────────────

function readStore(): AdminStore {
  if (typeof window === "undefined") return defaultStore();

  try {
    const raw = localStorage.getItem(ADMIN_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminStore;
      if (parsed?.catalog && parsed?.sections && parsed?.orders) {
        return {
          ...parsed,
          sections: normalizeSectionOrder(parsed.sections),
        };
      }
    }

    const legacy = localStorage.getItem(LEGACY_CATALOG_KEY);
    if (legacy) {
      const catalog = JSON.parse(legacy) as Record<string, CatalogProduct>;
      const store: AdminStore = {
        catalog,
        sections: structuredClone(DEFAULT_SECTIONS),
        orders: structuredClone(DEFAULT_ORDERS),
      };
      writeStoreLocal(store);
      return store;
    }
  } catch {
    // ignore
  }

  return defaultStore();
}

function writeStoreLocal(store: AdminStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(store));
  notifyProductsChanged();
}

function localGetSections(): AdminProductSection[] {
  return normalizeSectionOrder(readStore().sections);
}

function localGetProductsBySection(): Record<string, CatalogProduct[]> {
  const store = readStore();
  const result: Record<string, CatalogProduct[]> = {};
  for (const section of store.sections) {
    const ids = store.orders[section.id] ?? [];
    result[section.id] = ids
      .map((id) => store.catalog[id])
      .filter((p): p is CatalogProduct => Boolean(p));
  }
  return result;
}

// ── Public API (backend-first, same names used by SuperAdminDashboard) ──────

export type AdminProductSectionId = string;

/** @deprecated use getAdminSections() */
export const ADMIN_PRODUCT_SECTIONS = DEFAULT_SECTIONS;

export async function getAdminSections(): Promise<AdminProductSection[]> {
  const res = await apiFetch<ApiCategory[]>("/api/categories");
  if (!res.ok || !res.data) return localGetSections();
  return normalizeSectionOrder(res.data.map(mapApiCategory));
}

export async function getAdminProducts(): Promise<CatalogProduct[]> {
  const res = await apiFetch<ApiProduct[]>("/api/products");
  if (!res.ok || !res.data) return Object.values(readStore().catalog);
  return res.data.map(mapApiProduct);
}

export async function getAdminProductsBySection(): Promise<
  Record<string, CatalogProduct[]>
> {
  const res = await apiFetch<{
    categories: ApiCategory[];
    productsByCategory: Record<string, ApiProduct[]>;
  }>("/api/products/by-category");

  if (!res.ok || !res.data) return localGetProductsBySection();

  const result: Record<string, CatalogProduct[]> = {};
  for (const cat of res.data.categories) {
    result[cat.id] = (res.data.productsByCategory[cat.id] ?? []).map(
      mapApiProduct,
    );
  }
  return result;
}

export async function getAdminProduct(
  id: string,
): Promise<CatalogProduct | null> {
  const res = await apiFetch<ApiProduct>(`/api/products/${encodeURIComponent(id)}`);
  if (res.ok && res.data) return mapApiProduct(res.data);
  return readStore().catalog[id] ?? null;
}

export async function updateAdminProduct(
  id: string,
  draft: AdminProductDraft,
): Promise<CatalogProduct | null> {
  const res = await apiFetch<ApiProduct>(
    `/api/products/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(draftToApiBody(draft)),
    },
  );

  if (res.ok && res.data) {
    notifyProductsChanged();
    return mapApiProduct(res.data);
  }

  // Local fallback
  const store = readStore();
  const existing = store.catalog[id];
  if (!existing) return null;
  store.catalog[id] = {
    ...existing,
    title: draft.title.trim(),
    shortTitle: draft.shortTitle.trim(),
    category: draft.category.trim(),
    description: draft.description.trim(),
    price: Number(draft.price) || 0,
    compareAtPrice: Number(draft.compareAtPrice) || 0,
    ctaLabel: draft.ctaLabel.trim(),
    ctaHref: draft.ctaHref.trim(),
    highlights: draft.highlights.map((h) => h.trim()).filter(Boolean),
    media: buildMediaFromDraft(draft),
  };
  writeStoreLocal(store);
  return store.catalog[id];
}

export async function addAdminProduct(
  sectionId: string,
  draft: AdminProductDraft,
): Promise<CatalogProduct | null> {
  const res = await apiFetch<ApiProduct>("/api/products", {
    method: "POST",
    body: JSON.stringify(draftToApiBody(draft, sectionId)),
  });

  if (res.ok && res.data) {
    notifyProductsChanged();
    return mapApiProduct(res.data);
  }

  // Local fallback
  const store = readStore();
  if (!store.sections.some((s) => s.id === sectionId)) return null;
  const existingIds = new Set(Object.keys(store.catalog));
  const id = uniqueId(
    slugify(draft.shortTitle || draft.title),
    existingIds,
  );
  const product: CatalogProduct = {
    id,
    title: draft.title.trim(),
    shortTitle: draft.shortTitle.trim() || draft.title.trim(),
    category: draft.category.trim() || "General",
    description: draft.description.trim(),
    price: Number(draft.price) || 0,
    compareAtPrice: Number(draft.compareAtPrice) || 0,
    media: buildMediaFromDraft(draft),
    highlights: draft.highlights.map((h) => h.trim()).filter(Boolean),
    finishes: [],
    included: [],
    ctaLabel: draft.ctaLabel.trim() || "Order Now",
    ctaHref: draft.ctaHref.trim() || `/product/${id}`,
    designable: false,
  };
  store.catalog[id] = product;
  store.orders[sectionId] = [...(store.orders[sectionId] ?? []), id];
  writeStoreLocal(store);
  return product;
}

export async function deleteAdminProduct(id: string): Promise<boolean> {
  const res = await apiFetch<{ deleted: string }>(
    `/api/products/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );

  if (res.ok) {
    notifyProductsChanged();
    return true;
  }

  const store = readStore();
  if (!store.catalog[id]) return false;
  delete store.catalog[id];
  for (const sectionId of Object.keys(store.orders)) {
    store.orders[sectionId] = store.orders[sectionId].filter((pid) => pid !== id);
  }
  writeStoreLocal(store);
  return true;
}

export async function addAdminSection(input: {
  title: string;
  subtitle?: string;
  imageSrc?: string;
}): Promise<AdminProductSection | null> {
  const title = input.title.trim();
  if (!title) return null;

  const res = await apiFetch<ApiCategory>("/api/categories", {
    method: "POST",
    body: JSON.stringify({
      title,
      subtitle: input.subtitle?.trim() || `Products in ${title}.`,
      imageSrc: input.imageSrc?.trim() || undefined,
    }),
  });

  if (res.ok && res.data) {
    notifyProductsChanged();
    return mapApiCategory(res.data);
  }

  const store = readStore();
  const existingIds = new Set(store.sections.map((s) => s.id));
  const id = uniqueId(slugify(title), existingIds);
  const section: AdminProductSection = {
    id,
    title,
    subtitle: input.subtitle?.trim() || `Products in ${title}.`,
    imageSrc: input.imageSrc?.trim() || undefined,
  };
  store.sections.push(section);
  store.orders[id] = [];
  writeStoreLocal(store);
  return section;
}

export async function updateAdminSection(
  sectionId: string,
  input: {
    title: string;
    subtitle?: string;
    imageSrc?: string;
  },
): Promise<AdminProductSection | null> {
  const title = input.title.trim();
  if (!title) return null;

  const res = await apiFetch<ApiCategory>(
    `/api/categories/${encodeURIComponent(sectionId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        title,
        subtitle: input.subtitle?.trim() || `Products in ${title}.`,
        imageSrc: input.imageSrc?.trim() || undefined,
      }),
    },
  );

  if (res.ok && res.data) {
    notifyProductsChanged();
    return mapApiCategory(res.data);
  }

  const store = readStore();
  const index = store.sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return null;
  const next: AdminProductSection = {
    ...store.sections[index],
    title,
    subtitle: input.subtitle?.trim() || `Products in ${title}.`,
    imageSrc: input.imageSrc?.trim() || undefined,
  };
  store.sections[index] = next;
  writeStoreLocal(store);
  return next;
}

export async function deleteAdminSection(
  sectionId: string,
  options?: { deleteProducts?: boolean },
): Promise<boolean> {
  const deleteProducts = options?.deleteProducts !== false;

  if (deleteProducts) {
    const bySection = await getAdminProductsBySection();
    const products = bySection[sectionId] ?? [];
    await Promise.all(products.map((p) => deleteAdminProduct(p.id)));
  }

  const res = await apiFetch<{ deleted: string }>(
    `/api/categories/${encodeURIComponent(sectionId)}`,
    { method: "DELETE" },
  );

  if (res.ok) {
    notifyProductsChanged();
    return true;
  }

  const store = readStore();
  const index = store.sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return false;
  const productIds = store.orders[sectionId] ?? [];
  if (deleteProducts) {
    for (const productId of productIds) {
      delete store.catalog[productId];
    }
  }
  store.sections.splice(index, 1);
  delete store.orders[sectionId];
  writeStoreLocal(store);
  return true;
}

export function resetAdminProducts() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_STORE_KEY);
  localStorage.removeItem(LEGACY_CATALOG_KEY);
  notifyProductsChanged();
}

export function productImageSrc(product: CatalogProduct): string | null {
  const first = product.media[0];
  if (!first) return null;
  if (first.type === "image") return first.src;
  return first.thumbnail;
}
