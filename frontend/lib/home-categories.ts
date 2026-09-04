import { apiFetch } from "@/lib/api-config";
import { catalogImgPublicUrl } from "@/lib/admin-catalog-db";

export type HomeCategoryCard = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
};

type ApiCategory = {
  id: string;
  title: string;
  subtitle?: string;
  imageSrc?: string | null;
  status?: boolean;
  sortOrder?: number;
};

type ApiProduct = {
  id: string;
  title?: string;
  imageSrc?: string | null;
  media?: { type: string; src?: string; thumbnail?: string }[];
};

/** Known multi-product category hub pages */
const CATEGORY_HUB_HREF: Record<string, string> = {
  "business-card": "/product/nfc-business-card",
  "digital-profile-qr": "/product/digital-profile-qr",
  "social-media-card": "/product/social-media-cards",
  standee: "/product/google-review-standee",
};

const FALLBACK_IMAGE = "/Images/Products/digitalCard.jpeg";
/** Public site — categories/products hidden from marketing surfaces */
export const HIDDEN_PUBLIC_CATEGORY_IDS = new Set(["review-keychain"]);
export const HIDDEN_PUBLIC_PRODUCT_IDS = new Set([
  "review-keychain-qr",
  "metal-card",
]);

const HOME_CATEGORIES_CACHE_KEY = "hexaHomeCategories.v4";

function filterHiddenHomeCategories(
  cards: HomeCategoryCard[],
): HomeCategoryCard[] {
  return cards.filter((c) => !HIDDEN_PUBLIC_CATEGORY_IDS.has(c.id));
}

function publicImg(stored: string | null | undefined): string | null {
  return catalogImgPublicUrl(stored);
}

/** Offline / API-down fallback — Super Admin categories shown on homepage */
export const FALLBACK_HOME_CATEGORIES: HomeCategoryCard[] = filterHiddenHomeCategories([
  {
    id: "business-card",
    title: "Business Card",
    description:
      "NFC and PVC cards — your full digital identity in one tap.",
    image: "/Images/Products/digitalCard.jpeg",
    href: "/product/nfc-business-card",
  },
  {
    id: "digital-profile-qr",
    title: "Digital Profile + QR",
    description:
      "Print-ready QR that opens your profile instantly. No app, no friction.",
    image: "/Images/Products/DigitalprofileQr.jpeg",
    href: "/product/digital-profile-qr",
  },
  {
    id: "social-media-card",
    title: "Social Media Card",
    description:
      "Google, Instagram & YouTube cards — pick a platform and share in one tap.",
    image: "/Images/Products/googleReview.jpeg",
    href: "/product/social-media-cards",
  },
  {
    id: "standee",
    title: "Standee",
    description:
      "Google, Instagram & YouTube countertop standees for reviews and follows.",
    image: "/Images/Products/reviewStandy.jpeg",
    href: "/product/google-review-standee",
  },
]);

function productImage(product: ApiProduct | undefined): string | null {
  if (!product) return null;
  if (product.imageSrc) return publicImg(product.imageSrc);
  const media = product.media?.[0];
  if (!media) return null;
  if (media.type === "image" && media.src) return publicImg(media.src);
  if (media.thumbnail) return publicImg(media.thumbnail);
  return null;
}

function resolveHref(categoryId: string, products: ApiProduct[]): string {
  if (CATEGORY_HUB_HREF[categoryId]) return CATEGORY_HUB_HREF[categoryId];
  if (products.length === 1) return `/product/${products[0].id}`;
  if (products[0]?.id) return `/product/${products[0].id}`;
  return "/products";
}

function isValidCard(value: unknown): value is HomeCategoryCard {
  if (!value || typeof value !== "object") return false;
  const c = value as HomeCategoryCard;
  return (
    typeof c.id === "string" &&
    typeof c.title === "string" &&
    typeof c.description === "string" &&
    typeof c.image === "string" &&
    typeof c.href === "string"
  );
}

/** Last successful API result — avoids flashing hardcoded fallback on reload. */
export function readHomeCategoriesCache(): HomeCategoryCard[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HOME_CATEGORIES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed.every(isValidCard)) return null;
    return filterHiddenHomeCategories(parsed);
  } catch {
    return null;
  }
}

export function writeHomeCategoriesCache(list: HomeCategoryCard[]) {
  if (typeof window === "undefined" || list.length === 0) return;
  try {
    sessionStorage.setItem(HOME_CATEGORIES_CACHE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota
  }
}

export function clearHomeCategoriesCache() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(HOME_CATEGORIES_CACHE_KEY);
  } catch {
    // ignore
  }
}

function mapApiToCards(
  categories: ApiCategory[],
  productsByCategory: Record<string, ApiProduct[]>,
): HomeCategoryCard[] {
  return categories
    .filter((c) => c.status !== false && !HIDDEN_PUBLIC_CATEGORY_IDS.has(c.id))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((cat) => {
      const products = productsByCategory[cat.id] ?? [];
      const fallback = FALLBACK_HOME_CATEGORIES.find((f) => f.id === cat.id);
      const image =
        publicImg(cat.imageSrc) ||
        productImage(products[0]) ||
        fallback?.image ||
        FALLBACK_IMAGE;

      return {
        id: cat.id,
        title: cat.title?.trim() || fallback?.title || "Product",
        description:
          cat.subtitle?.trim() ||
          fallback?.description ||
          "Explore HexaCards products.",
        image,
        href: resolveHref(cat.id, products),
      } satisfies HomeCategoryCard;
    });
}

function cardsEqual(a: HomeCategoryCard[], b: HomeCategoryCard[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (card, i) =>
      card.id === b[i].id &&
      card.title === b[i].title &&
      card.description === b[i].description &&
      card.image === b[i].image &&
      card.href === b[i].href,
  );
}

/**
 * Load homepage product cards from Super Admin categories.
 * Returns null when API fails and no usable list should replace a warm cache.
 */
export async function fetchHomeCategories(): Promise<{
  cards: HomeCategoryCard[];
  fromApi: boolean;
}> {
  const res = await apiFetch<{
    categories: ApiCategory[];
    productsByCategory: Record<string, ApiProduct[]>;
  }>("/api/products/by-category");

  if (!res.ok || !res.data?.categories?.length) {
    const cached = readHomeCategoriesCache();
    return {
      cards: cached?.length ? cached : FALLBACK_HOME_CATEGORIES,
      fromApi: false,
    };
  }

  const cards = filterHiddenHomeCategories(
    mapApiToCards(
      res.data.categories,
      res.data.productsByCategory ?? {},
    ),
  );
  if (cards.length === 0) {
    const cached = readHomeCategoriesCache();
    return {
      cards: cached?.length ? cached : FALLBACK_HOME_CATEGORIES,
      fromApi: false,
    };
  }

  writeHomeCategoriesCache(cards);
  return { cards, fromApi: true };
}

export { cardsEqual };
