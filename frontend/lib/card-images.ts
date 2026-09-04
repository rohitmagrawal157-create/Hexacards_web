/**
 * Card profile / background image helpers.
 * DB stores only the file name (e.g. rohit-agrawal7256-profile.jpg).
 * UI resolves names to a public URL/path for display.
 *
 * Uploads overwrite the same filename, so display URLs must keep a `?v=`
 * cache-buster or the browser/CDN will keep showing the previous image.
 */

const UPLOADS_DIR = "/uploads/cards";
const IMAGES_DIR = "/Images";

/** Default Supabase Storage bucket — public, not a secret. */
export const DEFAULT_CARD_IMAGES_BUCKET = "card-images";

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
    return name ? name.slice(0, 255) : null;
  } catch {
    const name = t.split("?")[0].split("/").filter(Boolean).pop() || "";
    return name ? name.slice(0, 255) : null;
  }
}

function isUploadedCardFile(name: string): boolean {
  return /-(profile|background|order-logo)\.(jpe?g|png|webp|gif)$/i.test(name);
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
 * Turn a DB file name (or legacy full path) into a browser-usable src.
 * Uploaded profile/background files live in Supabase Storage — never use a bare
 * filename or a local /uploads path that 404s on Vercel.
 * Existing `?v=` query strings are always preserved.
 */
export function resolveCardImageSrc(
  stored: string | null | undefined,
  fallback: string,
  version?: string | number | null,
): string {
  if (!stored?.trim()) return fallback;
  const raw = stored.trim();
  if (raw.startsWith("data:") || raw.startsWith("idb:")) return raw;

  const name = cardImageFileName(raw);
  const qs = queryStringFromSrc(raw);

  if (name && isUploadedCardFile(name)) {
    const remote = getSupabaseCardImagePublicUrl(name);
    let base: string;
    if (remote) {
      base = remote;
    } else if (raw.startsWith("/uploads/")) {
      base = raw.split("?")[0];
    } else {
      base = `${UPLOADS_DIR}/${name}`;
    }
    const withQs = withQuery(base, qs);
    return withCardImageCacheBust(withQs, version);
  }

  if (/^https?:\/\//i.test(raw)) {
    return withCardImageCacheBust(raw, version);
  }
  if (raw.startsWith("/")) {
    return withCardImageCacheBust(withQuery(raw.split("?")[0], qs), version);
  }

  if (name) {
    return withCardImageCacheBust(`${IMAGES_DIR}/${name}`, version);
  }
  return fallback;
}

/** Value written to cards.logo / bg_img / bg_url — file name only. */
export function toCardImageDbName(
  src: string | null | undefined,
): string | null {
  return cardImageFileName(src);
}
