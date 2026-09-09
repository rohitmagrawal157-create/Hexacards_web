/** Quick-pick presets (stored as pathnames). Custom paths can also be pasted. */
export const OFFER_PAGE_OPTIONS = [
  { id: "home", label: "Home", path: "/" },
  { id: "products", label: "Products", path: "/products" },
  { id: "franchise", label: "Franchise", path: "/franchise" },
  { id: "product-details", label: "Product details", path: "/product" },
  { id: "design-your-card", label: "Design your card", path: "/design-your-card" },
] as const;

export type OfferPageId = (typeof OFFER_PAGE_OPTIONS)[number]["id"];

/** Any pathname or legacy preset id, e.g. `/contact` or `home` */
export type OfferPageTarget = string;

export type HomeOfferRow = {
  offer_id: number | string;
  title?: string | null;
  image_url: string;
  link_url: string;
  active: number;
  sort_order?: number | null;
  show_on_pages?: string | null;
  updated_at: string;
};

export type HomeOfferDto = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  sortOrder: number;
  /** Pathnames (and legacy keys) where this banner should open */
  showOnPages: OfferPageTarget[];
  updatedAt: string;
};

export type HomeOfferWriteBody = {
  title?: string;
  imageUrl?: string;
  image_url?: string;
  linkUrl?: string;
  link_url?: string;
  active?: boolean | number;
  sortOrder?: number;
  sort_order?: number;
  showOnPages?: string[] | string;
  show_on_pages?: string[] | string;
  imageDataUrl?: string;
  image_data_url?: string;
};

export const HOME_OFFER_COLS =
  "offer_id, title, image_url, link_url, active, sort_order, show_on_pages, updated_at" as const;

export const HOME_OFFER_COLS_LEGACY =
  "offer_id, image_url, link_url, active, updated_at" as const;

export const DEFAULT_HOME_OFFER: HomeOfferDto = {
  id: 0,
  title: "Default offer",
  imageUrl: "/Images/ads.png",
  linkUrl: "/products",
  active: true,
  sortOrder: 0,
  showOnPages: ["/"],
  updatedAt: new Date(0).toISOString(),
};

const PRESET_BY_ID = new Map(
  OFFER_PAGE_OPTIONS.map((p) => [p.id, p.path] as const),
);

/**
 * Normalize pasted URLs / paths / legacy keys to a site pathname.
 * Examples: `home` → `/`, `https://x.com/contact` → `/contact`
 */
export function normalizePageTarget(raw: string): string {
  let v = String(raw ?? "").trim();
  if (!v) return "";
  // Reject pasted data-URLs / absurd values (prevents stack blowups on save)
  if (v.length > 512 || /^data:/i.test(v)) return "";

  const lower = v.toLowerCase();
  const preset = PRESET_BY_ID.get(lower);
  if (preset) return preset;

  try {
    if (/^https?:\/\//i.test(v)) {
      v = new URL(v).pathname || "/";
    }
  } catch {
    // keep as-is
  }

  if (!v.startsWith("/")) v = `/${v.replace(/^\/+/, "")}`;
  if (v.length > 1 && v.endsWith("/")) v = v.slice(0, -1);
  if (v.length > 512) return "";

  // legacy alias
  if (v.toLowerCase() === "/product-details") return "/product";

  // Compare paths case-insensitively (pasted URLs / Next routes)
  if (v !== "/") v = v.toLowerCase();

  return v;
}

export function parseOfferPages(raw: unknown): OfferPageTarget[] {
  let parts: string[] = [];
  if (Array.isArray(raw)) {
    parts = raw.map((v) => String(v ?? "").trim());
  } else if (typeof raw === "string" && raw.trim()) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          parts = parsed.map((v) => String(v ?? "").trim());
        }
      } catch {
        parts = trimmed.split(/[,|;]+/).map((p) => p.trim());
      }
    } else {
      parts = trimmed.split(/[,|;]+/).map((p) => p.trim());
    }
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const norm = normalizePageTarget(p);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out.length > 0 ? out : ["/"];
}

export function serializeOfferPages(
  pages: string[] | string | undefined | null,
): string {
  return parseOfferPages(pages).join(",");
}

export function offerMatchesPathname(
  offer: Pick<HomeOfferDto, "showOnPages" | "active">,
  pathname: string,
): boolean {
  if (!offer.active) return false;
  const current = normalizePageTarget(pathname || "/") || "/";

  for (const raw of offer.showOnPages) {
    const target = normalizePageTarget(raw);
    if (!target) continue;

    if (target === "/") {
      if (current === "/") return true;
      continue;
    }

    // Product details: any /product or /product/...
    if (target === "/product") {
      if (current === "/product" || current.startsWith("/product/")) return true;
      continue;
    }

    if (current === target || current.startsWith(`${target}/`)) return true;
  }
  return false;
}

/**
 * When several active offers include the same page, prefer:
 * 1) more specific (fewer pages), then
 * 2) most recently updated, then
 * 3) highest id
 * so a dedicated /services banner beats an older multi-page offer.
 */
export function pickOfferForPathname(
  offers: HomeOfferDto[],
  pathname: string,
): HomeOfferDto | null {
  const matches = offers.filter((o) => offerMatchesPathname(o, pathname));
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  const current = normalizePageTarget(pathname || "/") || "/";

  matches.sort((a, b) => {
    const aExact = a.showOnPages.some(
      (p) => normalizePageTarget(p) === current,
    )
      ? 0
      : 1;
    const bExact = b.showOnPages.some(
      (p) => normalizePageTarget(p) === current,
    )
      ? 0
      : 1;
    if (aExact !== bExact) return aExact - bExact;

    const aPages = a.showOnPages.length || 99;
    const bPages = b.showOnPages.length || 99;
    if (aPages !== bPages) return aPages - bPages;

    const aTime = Date.parse(a.updatedAt) || 0;
    const bTime = Date.parse(b.updatedAt) || 0;
    if (aTime !== bTime) return bTime - aTime;

    return b.id - a.id;
  });

  return matches[0];
}

/** @deprecated use offerMatchesPathname */
export function offerShowsOnPage(
  offer: Pick<HomeOfferDto, "showOnPages" | "active">,
  page: string,
): boolean {
  return offerMatchesPathname(offer, page);
}

export function mapHomeOffer(row: HomeOfferRow): HomeOfferDto {
  return {
    id: Number(row.offer_id),
    title: (row.title || "").trim() || "Offer",
    imageUrl: sanitizeOfferImageUrl(row.image_url),
    linkUrl: (row.link_url || "").trim() || DEFAULT_HOME_OFFER.linkUrl,
    active: Number(row.active) === 1,
    sortOrder: Number(row.sort_order) || 0,
    showOnPages: parseOfferPages(row.show_on_pages ?? "/"),
    updatedAt: row.updated_at,
  };
}

export function normalizeOfferLink(raw: string): string {
  const v = raw.trim();
  if (!v) return "/products";
  if (/^data:/i.test(v) || v.length > 2000) return "/products";
  if (v.startsWith("/") || /^https?:\/\//i.test(v)) return v;
  return `/${v.replace(/^\/+/, "")}`;
}

export function sanitizeOfferImageUrl(raw: string | null | undefined): string {
  const v = String(raw ?? "").trim();
  if (!v || /^data:/i.test(v) || v.length > 2000) {
    return DEFAULT_HOME_OFFER.imageUrl;
  }
  return v;
}

export function labelForPageTarget(target: string): string {
  const norm = normalizePageTarget(target);
  const preset = OFFER_PAGE_OPTIONS.find((p) => p.path === norm);
  if (preset) return preset.label;
  return norm || target;
}

export function isMissingColumnError(message: string | undefined | null) {
  if (!message) return false;
  // Keep checks linear — avoid catastrophic backtracking on huge DB errors
  const m = message.slice(0, 500);
  return (
    /title|sort_order|show_on_pages/i.test(m) ||
    /column .* does not exist/i.test(m)
  );
}

export function isMissingTableError(message: string | undefined | null) {
  return Boolean(
    message &&
      (message.includes("does not exist") || message.includes("schema cache")),
  );
}
