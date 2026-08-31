import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-config";
import {
  buildCatalogFromApiRows,
  mergeApiProductToCatalog,
  type ApiProductShape,
} from "@/lib/product-merge";
import {
  productCatalog,
  type CatalogProduct,
} from "@/lib/product-catalog";

const CACHE_KEY = "hexaPublicProducts.v1";
export const PUBLIC_PRODUCTS_CHANGE = "hexa-public-products-change";

let memoryCatalog: Record<string, CatalogProduct> | null = null;
let inflight: Promise<Record<string, CatalogProduct>> | null = null;

function readSessionCache(): Record<string, CatalogProduct> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, CatalogProduct>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeSessionCache(catalog: Record<string, CatalogProduct>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(catalog));
  } catch {
    // ignore quota
  }
}

export function clearPublicProductsCache() {
  memoryCatalog = null;
  inflight = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(PUBLIC_PRODUCTS_CHANGE));
  }
}

/** Sync read — returns cached live product if available. */
export function getCachedPublicProduct(id: string): CatalogProduct | null {
  const fromMemory = memoryCatalog?.[id];
  if (fromMemory) return fromMemory;
  const fromSession = readSessionCache()?.[id];
  if (fromSession) return fromSession;
  return null;
}

/**
 * Load all products from API (merged over static defaults).
 * Cached in memory + sessionStorage until admin updates or force refresh.
 */
export async function ensurePublicProducts(
  force = false,
): Promise<Record<string, CatalogProduct>> {
  if (!force && memoryCatalog) return memoryCatalog;

  if (!force) {
    const session = readSessionCache();
    if (session) {
      memoryCatalog = session;
      return session;
    }
  }

  if (!force && inflight) return inflight;

  inflight = (async () => {
    const res = await apiFetch<ApiProductShape[]>("/api/products?active=true");
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      const catalog = buildCatalogFromApiRows(res.data);
      memoryCatalog = catalog;
      writeSessionCache(catalog);
      return catalog;
    }

    const fallback = { ...productCatalog };
    memoryCatalog = fallback;
    return fallback;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export async function fetchPublicProduct(
  id: string,
): Promise<CatalogProduct | null> {
  const catalog = await ensurePublicProducts();
  return catalog[id] ?? productCatalog[id] ?? null;
}

function staticProduct(
  productId: string,
  productProp?: CatalogProduct,
): CatalogProduct {
  if (productProp) return productProp;
  return productCatalog[productId] ?? productCatalog["nfc-business-card"];
}

/**
 * Client hook for live Super Admin prices.
 * Pass `product` from the server when available — avoids price flash on detail pages.
 */
export function usePublicProduct(
  productId: string,
  productProp?: CatalogProduct,
): CatalogProduct {
  const [product, setProduct] = useState<CatalogProduct>(() =>
    staticProduct(productId, productProp),
  );

  useEffect(() => {
    if (productProp) {
      setProduct(productProp);
    }
  }, [productProp, productId]);

  useEffect(() => {
    let cancelled = false;

    function apply(live: CatalogProduct | undefined) {
      if (cancelled || !live) return;
      setProduct(live);
    }

    function refresh() {
      void ensurePublicProducts(true).then((catalog) =>
        apply(catalog[productId]),
      );
    }

    if (productProp) {
      // Server already sent DB price — only refresh after admin edits
      window.addEventListener(PUBLIC_PRODUCTS_CHANGE, refresh);
      window.addEventListener("hexa-admin-products-change", refresh);
      return () => {
        cancelled = true;
        window.removeEventListener(PUBLIC_PRODUCTS_CHANGE, refresh);
        window.removeEventListener("hexa-admin-products-change", refresh);
      };
    }

    void ensurePublicProducts(true).then((catalog) => apply(catalog[productId]));

    window.addEventListener(PUBLIC_PRODUCTS_CHANGE, refresh);
    window.addEventListener("hexa-admin-products-change", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(PUBLIC_PRODUCTS_CHANGE, refresh);
      window.removeEventListener("hexa-admin-products-change", refresh);
    };
  }, [productId, productProp]);

  return product;
}

export function usePublicProductsCatalog(
  initialCatalog?: Record<string, CatalogProduct>,
): Record<string, CatalogProduct> {
  const [catalog, setCatalog] = useState<Record<string, CatalogProduct>>(
    () => initialCatalog ?? productCatalog,
  );

  useEffect(() => {
    if (initialCatalog) {
      setCatalog(initialCatalog);
    }
  }, [initialCatalog]);

  useEffect(() => {
    let cancelled = false;

    function apply(next: Record<string, CatalogProduct>) {
      if (!cancelled) setCatalog(next);
    }

    function refresh() {
      void ensurePublicProducts(true).then(apply);
    }

    if (!initialCatalog) {
      void ensurePublicProducts(true).then(apply);
    }

    window.addEventListener(PUBLIC_PRODUCTS_CHANGE, refresh);
    window.addEventListener("hexa-admin-products-change", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(PUBLIC_PRODUCTS_CHANGE, refresh);
      window.removeEventListener("hexa-admin-products-change", refresh);
    };
  }, [initialCatalog]);

  return catalog;
}

export { mergeApiProductToCatalog };
