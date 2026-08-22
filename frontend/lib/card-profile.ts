import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { buildCardSlugFromName } from "@/lib/order-card";

export type CardLayoutId =
  | "classic"
  | "basic"
  | "modern"
  | "compact"
  | "social"
  | "minimalist"
  | "bold"
  | "elegant";

const AVAILABLE_LAYOUTS: CardLayoutId[] = [
  "classic",
  "basic",
  "modern",
  "compact",
  "social",
  "minimalist",
];

export function normalizeCardLayout(
  value: string | null | undefined,
): CardLayoutId {
  if (value && (AVAILABLE_LAYOUTS as string[]).includes(value)) {
    return value as CardLayoutId;
  }
  return "classic";
}

export type CardContactInfo = {
  cardName: string;
  title: string;
  businessName: string;
  countryCode: string;
  mobile: string;
  whatsapp: string;
  email: string;
  website: string;
  state: string;
  city: string;
  address: string;
  brochureName: string | null;
  brochureMime: string | null;
  brochureSize: number | null;
};

export type CardSocialLinks = {
  instagram: string;
  facebook: string;
  linkedin: string;
  twitter: string;
  youtube: string;
  googleReview: string;
  telegram: string;
  snapchat: string;
  pinterest: string;
  tripadvisor: string;
};

export type CardBusinessInfo = {
  about: string;
  services: string[];
};

export type CardAppearance = {
  coverImage: string | null;
  logoImage: string | null;
  shareImage: string | null;
  accentColor: string;
  /** Card layout id — classic, basic, modern, compact & social available */
  layout: CardLayoutId;
};

/** Default fixed card background for all new cards */
export const DEFAULT_CARD_BANNER = "/Images/background_img.jpeg";

/** Default avatar shown on new cards until the user uploads their own */
export const DEFAULT_CARD_AVATAR = "/Images/avatar_default.svg";

export const CARD_BANNER_PRESETS = [
  { id: "default", label: "Default", src: DEFAULT_CARD_BANNER },
] as const;

export const CARD_AVATAR_PRESETS = [
  { id: "default", label: "Default", src: DEFAULT_CARD_AVATAR },
] as const;

const LEGACY_DEFAULT_COVERS = new Set([
  "/Images/banner.webp",
  "/Images/banner.png",
]);

/** Keep custom uploads; map missing/legacy stock banners to the fixed default. */
export function normalizeCoverImage(cover: string | null | undefined) {
  if (!cover) return DEFAULT_CARD_BANNER;
  if (cover.startsWith("data:")) return cover;
  if (LEGACY_DEFAULT_COVERS.has(cover)) return DEFAULT_CARD_BANNER;
  return cover;
}

/** Keep custom uploads; missing avatar uses the default avatar image. */
export function normalizeLogoImage(logo: string | null | undefined) {
  if (!logo) return DEFAULT_CARD_AVATAR;
  if (logo.startsWith("data:")) return logo;
  return logo;
}

export function isDefaultCoverImage(cover: string | null | undefined) {
  const normalized = normalizeCoverImage(cover);
  return normalized === DEFAULT_CARD_BANNER;
}

export function isDefaultLogoImage(logo: string | null | undefined) {
  const normalized = normalizeLogoImage(logo);
  return normalized === DEFAULT_CARD_AVATAR;
}

export const CARD_ACCENT_COLORS = [
  "#BC7C10",
  "#141414",
  "#1565C0",
  "#0D9488",
  "#00B813",
  "#E53935",
  "#C2185B",
  "#7C3AED",
  "#EA580C",
  "#0891B2",
  "#CA8A04",
  "#BE185D",
] as const;

/** Legacy value — treated as a solid accent (no gradients) */
export const MULTICOLOR_ACCENT = "multicolor";

/** Color-wheel look for the custom color picker trigger only */
export function multicolorWheelStyle() {
  return {
    backgroundColor: "#E91E63",
    backgroundImage:
      "conic-gradient(from 0deg, #E91E63, #FF5722, #FF9800, #FFEB3B, #CDDC39, #8BC34A, #4CAF50, #00BCD4, #2196F3, #9C27B0, #E91E63)",
  } as const;
}

export function isMulticolorAccent(color: string | null | undefined) {
  return (color || "").trim().toLowerCase() === MULTICOLOR_ACCENT;
}

/** Resolved accent tokens for card UI — solid colors only */
export function resolveCardAccent(color: string | null | undefined) {
  const raw = (color || "#BC7C10").trim();
  const solid = isMulticolorAccent(raw) ? "#E91E63" : raw;
  return {
    solid,
    soft: `${solid}33`,
    muted: `${solid}55`,
  };
}

export type HexaCardProfile = {
  contact: CardContactInfo;
  social: CardSocialLinks;
  business: CardBusinessInfo;
  appearance: CardAppearance;
  updatedAt: string;
};

/** Normalize stored phone (national or E.164) for react-phone-number-input */
export function normalizePhoneForInput(
  number: string,
  countryCode = "IN",
): string {
  const raw = number.trim();
  if (!raw) return "";
  if (raw.startsWith("+")) {
    return parsePhoneNumberFromString(raw)?.number || raw;
  }
  const country = countryCode.toUpperCase() as CountryCode;
  return parsePhoneNumberFromString(raw, country)?.number || raw;
}

/** Display-ready international phone, powered by libphonenumber-js */
export function formatDialNumber(countryCode: string, number: string) {
  const normalized = normalizePhoneForInput(number, countryCode);
  if (!normalized) return "";
  const parsed = parsePhoneNumberFromString(
    normalized,
    countryCode.toUpperCase() as CountryCode,
  );
  if (parsed) return parsed.formatInternational();
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

export function phoneDigitsForLink(countryCode: string, number: string) {
  return formatDialNumber(countryCode, number).replace(/\D/g, "");
}

export const BROCHURE_MAX_BYTES = 5 * 1024 * 1024;

const PROFILE_KEY = "hexaCardProfile";
const BROCHURE_DB = "hexaCardAssets";
const BROCHURE_STORE = "files";
const BROCHURE_KEY = "brochure";

export function defaultCardProfile(name = "User", phone = ""): HexaCardProfile {
  return {
    contact: {
      cardName: name,
      title: "",
      businessName: "",
      countryCode: "IN",
      mobile: phone,
      whatsapp: phone,
      email: "",
      website: "",
      state: "",
      city: "",
      address: "",
      brochureName: null,
      brochureMime: null,
      brochureSize: null,
    },
    social: {
      instagram: "",
      facebook: "",
      linkedin: "",
      twitter: "",
      youtube: "",
      googleReview: "",
      telegram: "",
      snapchat: "",
      pinterest: "",
      tripadvisor: "",
    },
    business: {
      about: "",
      services: [],
    },
    appearance: {
      coverImage: DEFAULT_CARD_BANNER,
      logoImage: DEFAULT_CARD_AVATAR,
      shareImage: null,
      accentColor: "#BC7C10",
      layout: "classic",
    },
    updatedAt: new Date().toISOString(),
  };
}

export function getCardProfile(
  fallbackName?: string,
  fallbackPhone?: string,
): HexaCardProfile {
  if (typeof window === "undefined") {
    return defaultCardProfile(fallbackName, fallbackPhone);
  }
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultCardProfile(fallbackName, fallbackPhone);
    const parsed = JSON.parse(raw) as HexaCardProfile & {
      business?: Partial<CardBusinessInfo> & { description?: string };
    };
    const base = defaultCardProfile(fallbackName, fallbackPhone);
    return {
      ...base,
      ...parsed,
      contact: {
        ...base.contact,
        ...parsed.contact,
        brochureName: parsed.contact?.brochureName ?? null,
        brochureMime: parsed.contact?.brochureMime ?? null,
        brochureSize: parsed.contact?.brochureSize ?? null,
      },
      social: {
        ...base.social,
        ...parsed.social,
      },
      business: {
        ...base.business,
        ...parsed.business,
        about:
          parsed.business?.about?.trim() ||
          parsed.business?.description?.trim() ||
          "",
        services: Array.isArray(parsed.business?.services)
          ? parsed.business.services.filter(
              (s): s is string => typeof s === "string" && s.trim().length > 0,
            )
          : [],
      },
      appearance: {
        ...base.appearance,
        ...parsed.appearance,
        coverImage: normalizeCoverImage(parsed.appearance?.coverImage),
        logoImage: normalizeLogoImage(parsed.appearance?.logoImage),
        accentColor: isMulticolorAccent(parsed.appearance?.accentColor)
          ? "#E91E63"
          : parsed.appearance?.accentColor || base.appearance.accentColor,
        layout: normalizeCardLayout(
          (parsed.appearance as { layout?: string } | undefined)?.layout,
        ),
      },
    };
  } catch {
    return defaultCardProfile(fallbackName, fallbackPhone);
  }
}

const MAX_DATA_URL_CHARS = 450_000;

function isQuotaError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function shrinkDataUrl(dataUrl: string | null, maxChars = MAX_DATA_URL_CHARS) {
  if (!dataUrl || dataUrl.length <= maxChars) return dataUrl;
  return null;
}

function writeProfile(next: HexaCardProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
}

export function saveCardProfile(profile: HexaCardProfile): HexaCardProfile {
  const next: HexaCardProfile = {
    ...profile,
    appearance: {
      ...profile.appearance,
      layout: normalizeCardLayout(profile.appearance?.layout),
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    writeProfile(next);
  } catch (error) {
    if (!isQuotaError(error)) throw error;

    // Drop oversized / optional images so the rest of the profile still saves
    const trimmed: HexaCardProfile = {
      ...next,
      appearance: {
        ...next.appearance,
        shareImage: shrinkDataUrl(next.appearance.shareImage, 200_000),
        coverImage: shrinkDataUrl(next.appearance.coverImage),
        logoImage: shrinkDataUrl(next.appearance.logoImage, 200_000),
      },
    };

    try {
      localStorage.removeItem(PROFILE_KEY);
      writeProfile(trimmed);
      Object.assign(next, trimmed);
    } catch (retryError) {
      if (!isQuotaError(retryError)) throw retryError;
      const minimal: HexaCardProfile = {
        ...next,
        appearance: {
          ...next.appearance,
          coverImage: DEFAULT_CARD_BANNER,
          logoImage: DEFAULT_CARD_AVATAR,
          shareImage: null,
        },
      };
      localStorage.removeItem(PROFILE_KEY);
      writeProfile(minimal);
      Object.assign(next, minimal);
    }
  }

  window.dispatchEvent(new Event("hexa-card-profile-change"));
  return next;
}

/** Resize + JPEG-compress an image file for localStorage-friendly data URLs */
export function compressImageFile(
  file: File,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number },
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 1280;
  const maxHeight = options?.maxHeight ?? 1280;
  const quality = options?.quality ?? 0.72;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Not an image file"));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(
        1,
        maxWidth / img.naturalWidth,
        maxHeight / img.naturalHeight,
      );
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

/** Public slug from card name + phone — e.g. faizan-shaikh77 */
export function cardPublicSlug(profile: HexaCardProfile) {
  const name = profile.contact.cardName.trim() || "HexaCard";
  const phone =
    profile.contact.mobile.trim() ||
    profile.contact.whatsapp.trim() ||
    "";
  return buildCardSlugFromName(name, phone);
}

/** Public share URL shown to users — same style as hexacards.com/CardName45 */
export function cardPublicUrl(profile: HexaCardProfile) {
  return `https://hexacards.com/${cardPublicSlug(profile)}`;
}

/** Local app path for opening the card page */
export function cardPublicPath(profile: HexaCardProfile) {
  return `/${cardPublicSlug(profile)}`;
}

function openBrochureDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BROCHURE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BROCHURE_STORE)) {
        db.createObjectStore(BROCHURE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
}

export async function saveBrochureFile(file: File): Promise<void> {
  if (file.size > BROCHURE_MAX_BYTES) {
    throw new Error("Brochure must be 5 MB or smaller");
  }
  const db = await openBrochureDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BROCHURE_STORE, "readwrite");
    tx.objectStore(BROCHURE_STORE).put(file, BROCHURE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to save brochure"));
  });
  db.close();
}

export async function getBrochureFile(): Promise<Blob | null> {
  const db = await openBrochureDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(BROCHURE_STORE, "readonly");
    const req = tx.objectStore(BROCHURE_STORE).get(BROCHURE_KEY);
    req.onsuccess = () => resolve((req.result as Blob | undefined) || null);
    req.onerror = () => reject(req.error || new Error("Failed to load brochure"));
  });
  db.close();
  return blob;
}

export async function clearBrochureFile(): Promise<void> {
  const db = await openBrochureDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BROCHURE_STORE, "readwrite");
    tx.objectStore(BROCHURE_STORE).delete(BROCHURE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to clear brochure"));
  });
  db.close();
}

export async function openBrochureDownload(fileName?: string | null) {
  const blob = await getBrochureFile();
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.download = fileName || "brochure";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return true;
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


