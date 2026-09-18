/**
 * Card profile / background image helpers.
 * DB stores only the file name (e.g. rohit-agrawal7256-profile.jpg).
 * Legacy rows may store theme IDs in bg_img ("1") and real files in bg_url /
 * logo ("7986….png", "IMG_0746.jpeg").
 *
 * UI resolves names to Supabase Storage (or legacy CDN) for display.
 */

const UPLOADS_DIR = "/uploads/cards";
const IMAGES_DIR = "/Images";

/** Default Supabase Storage bucket — public, not a secret. */
export const DEFAULT_CARD_IMAGES_BUCKET = "card-images";

const IMAGE_FILE_RE = /\.(jpe?g|png|webp|gif|svg)$/i;

/** Stock files shipped in frontend/public/Images — not user uploads. */
const BUNDLED_STOCK_RE =
  /^(background_img|avatar_default|banner|Hexacards|ads)(\.|$)/i;

function legacyCardImageBases(): string[] {
  const fromEnv = process.env.NEXT_PUBLIC_LEGACY_CARD_IMAGES_BASE?.trim();
  const list = [
    fromEnv,
    "https://hexacards.com/Images",
    "https://hexacards.com/images",
    "https://hexacards.com/uploads",
    "https://www.hexacards.com/Images",
  ].filter(Boolean) as string[];
  return [...new Set(list.map((b) => b.replace(/\/$/, "")))];
}

/** Public Supabase Storage URL for an uploaded card image file name. */
export function getSupabaseCardImagePublicUrl(
  filename: string,
  bucket = DEFAULT_CARD_IMAGES_BUCKET,
): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(
    /\/$/,
    "",
  );
  if (!supabaseUrl) return null;

  const safeName =
    filename.split("/").filter(Boolean).pop()?.split("?")[0] || filename;
  if (!safeName) return null;

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(safeName)}`;
}

/** Extract bare file name from a path, URL, or name. */
export function cardImageFileName(
  src: string | null | undefined,
): string | null {
  if (!src) return null;
  const t = src.trim();
  if (!t || t.startsWith("data:") || t.startsWith("idb:")) return null;
  try {
    const bare = (t.includes("://") ? new URL(t).pathname : t).split("?")[0];
    const name = bare.split("/").filter(Boolean).pop() || "";
    return name ? decodeURIComponent(name).slice(0, 255) : null;
  } catch {
    const name = t.split("?")[0].split("/").filter(Boolean).pop() || "";
    return name ? name.slice(0, 255) : null;
  }
}

/** Legacy theme / preset ids stored in cards.bg_img ("1", "15") — not files. */
export function isLegacyThemeImageId(
  stored: string | null | undefined,
): boolean {
  if (!stored) return false;
  const t = stored.trim();
  return /^\d+$/.test(t);
}

function isUploadedCardFile(name: string): boolean {
  return /-(profile|background|order-logo|banner)\.(jpe?g|png|webp|gif)$/i.test(
    name,
  );
}

function isUserImageFile(name: string): boolean {
  if (!IMAGE_FILE_RE.test(name)) return false;
  if (BUNDLED_STOCK_RE.test(name)) return false;
  return true;
}

function queryStringFromSrc(raw: string): string {
  if (!raw.includes("?")) return "";
  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).searchParams.toString();
    }
  } catch {
    // fall through
  }
  return raw.split("?").slice(1).join("?");
}

function withQuery(base: string, qs: string): string {
  const bare = base.split("?")[0];
  return qs ? `${bare}?${qs}` : bare;
}

/**
 * Attach or keep a cache-buster so overwritten profile/background files refresh.
 * Fresh uploads already include `?v=timestamp` — those are preserved.
 */
export function withCardImageCacheBust(
  url: string,
  version?: string | number | null,
): string {
  if (!url || url.startsWith("data:") || url.startsWith("idb:")) return url;
  if (/[?&]v=/.test(url)) return url;

  if (version == null || version === "") return url;

  const bare = url.split("?")[0];
  const raw = String(version).trim();
  const parsed = Date.parse(raw);
  const stamp = Number.isFinite(parsed)
    ? parsed
    : typeof version === "number"
      ? version
      : encodeURIComponent(raw);
  return `${bare}?v=${stamp}`;
}

/**
 * Prefer a real image file for cover: bg_url first, then non-numeric bg_img.
 * Ignores legacy theme ids like "1" / "15" in bg_img.
 */
export function pickStoredCardCover(
  bgUrl: string | null | undefined,
  bgImg: string | null | undefined,
): string | null {
  const url = (bgUrl ?? "").trim();
  const img = (bgImg ?? "").trim();
  if (url && !isLegacyThemeImageId(url) && url.toLowerCase() !== "null") {
    return url;
  }
  if (img && !isLegacyThemeImageId(img) && img.toLowerCase() !== "null") {
    return img;
  }
  return null;
}

/** Alternate URLs to try when the primary src 404s (legacy PHP host). */
export function legacyCardImageCandidateUrls(filename: string): string[] {
  const name = cardImageFileName(filename);
  if (!name || !isUserImageFile(name)) return [];
  return legacyCardImageBases().map(
    (base) => `${base}/${encodeURIComponent(name)}`,
  );
}

/**
 * Turn a DB file name (or legacy full path) into a browser-usable src.
 * - Theme ids ("1") → fallback
 * - User uploads → Supabase Storage public URL
 * - Stock /Images/* paths stay local
 */
export function resolveCardImageSrc(
  stored: string | null | undefined,
  fallback: string,
  version?: string | number | null,
): string {
  if (!stored?.trim()) return fallback;
  const raw = stored.trim();
  if (raw.startsWith("data:") || raw.startsWith("idb:")) return raw;
  if (raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") {
    return fallback;
  }
  // Legacy bg_img theme ids are not files
  if (isLegacyThemeImageId(raw)) return fallback;

  const name = cardImageFileName(raw);
  const qs = queryStringFromSrc(raw);

  // Bundled stock under /Images (defaults, product shots, etc.)
  // But reject /Images/1 style legacy theme-id mistakes
  if (raw.startsWith("/Images/") || (name && BUNDLED_STOCK_RE.test(name))) {
    if (name && isLegacyThemeImageId(name)) return fallback;
    const base = raw.startsWith("/")
      ? raw.split("?")[0]
      : `${IMAGES_DIR}/${name}`;
    return withCardImageCacheBust(withQuery(base, qs), version);
  }

  if (name && (isUploadedCardFile(name) || isUserImageFile(name))) {
    const remote = getSupabaseCardImagePublicUrl(name);
    let base: string;
    if (remote) {
      base = remote;
    } else if (raw.startsWith("/uploads/")) {
      base = raw.split("?")[0];
    } else {
      base = `${UPLOADS_DIR}/${name}`;
    }
    return withCardImageCacheBust(withQuery(base, qs), version);
  }

  if (/^https?:\/\//i.test(raw)) {
    return withCardImageCacheBust(raw, version);
  }
  if (raw.startsWith("/")) {
    return withCardImageCacheBust(withQuery(raw.split("?")[0], qs), version);
  }

  // Unknown non-image token — do not invent /Images/{token}
  return fallback;
}

/** Value written to cards.logo / bg_img / bg_url — file name only. */
export function toCardImageDbName(
  src: string | null | undefined,
): string | null {
  if (isLegacyThemeImageId(src)) return null;
  return cardImageFileName(src);
}
