/**
 * Card profile / background image helpers.
 * DB stores only the file name (e.g. rohit-agrawal7256-profile.jpg).
 * UI resolves names to a public URL/path for display.
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
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

function uploadedFileSrc(name: string): string {
  const remote = getSupabaseCardImagePublicUrl(name);
  if (remote) return remote;
  return `${UPLOADS_DIR}/${name}`;
}

/**
 * Turn a DB file name (or legacy full path) into a browser-usable src.
 * Uploaded profile/background files live in Supabase Storage — never use a bare
 * filename or a local /uploads path that 404s on Vercel.
 */
export function resolveCardImageSrc(
  stored: string | null | undefined,
  fallback: string,
): string {
  if (!stored?.trim()) return fallback;
  const raw = stored.trim();
  if (raw.startsWith("data:") || raw.startsWith("idb:")) return raw;

  const name = cardImageFileName(raw);

  if (name && isUploadedCardFile(name)) {
    const remote = getSupabaseCardImagePublicUrl(name);
    if (remote) {
      if (/^https?:\/\//i.test(raw) && raw.includes("?")) {
        const qs = raw.split("?")[1];
        return qs ? `${remote}?${qs}` : remote;
      }
      return remote;
    }
    if (raw.startsWith("/uploads/")) return raw.split("?")[0];
    return `${UPLOADS_DIR}/${name}`;
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw.split("?")[0];

  if (name) return `${IMAGES_DIR}/${name}`;
  return fallback;
}

/** Value written to cards.logo / bg_img / bg_url — file name only. */
export function toCardImageDbName(
  src: string | null | undefined,
): string | null {
  return cardImageFileName(src);
}
