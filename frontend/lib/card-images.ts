/**
 * Card profile / background image helpers.
 * DB stores only the file name (e.g. rohit-agrawal7256-profile.jpg).
 * UI resolves names to a public URL/path for display.
 */

const UPLOADS_DIR = "/uploads/cards";
const IMAGES_DIR = "/Images";

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
  return /-(profile|background)\.(jpe?g|png|webp|gif)$/i.test(name);
}

/**
 * Turn a DB file name (or legacy full path) into a browser-usable src.
 */
export function resolveCardImageSrc(
  stored: string | null | undefined,
  fallback: string,
): string {
  if (!stored?.trim()) return fallback;
  const raw = stored.trim();
  if (raw.startsWith("data:") || raw.startsWith("idb:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;

  // Legacy full app path already usable
  if (raw.startsWith("/")) return raw;

  const name = cardImageFileName(raw) || raw;
  if (isUploadedCardFile(name)) {
    return `${UPLOADS_DIR}/${name}`;
  }
  return `${IMAGES_DIR}/${name}`;
}

/** Value written to cards.logo / bg_img / bg_url — file name only. */
export function toCardImageDbName(
  src: string | null | undefined,
): string | null {
  return cardImageFileName(src);
}
