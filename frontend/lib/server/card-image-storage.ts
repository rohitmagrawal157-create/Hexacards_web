import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type CardImageKind = "profile" | "background";

const BUCKET =
  process.env.CARD_IMAGES_BUCKET?.trim() || "card-images";

/** Sanitize unic_card_name for safe filenames */
export function sanitizeCardUsername(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "card";
}

/**
 * Fixed filenames per card username — always overwrite the same file.
 * e.g. faizan-shaikh77-profile.jpg
 */
export function cardImageFilename(
  username: string,
  kind: CardImageKind,
): string {
  const base = sanitizeCardUsername(username);
  return kind === "profile"
    ? `${base}-profile.jpg`
    : `${base}-background.jpg`;
}

function withCacheBust(url: string): string {
  const bare = url.split("?")[0];
  return `${bare}?v=${Date.now()}`;
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw new Error("Invalid image data URL");
  }
  return {
    contentType: match[1] || "image/jpeg",
    buffer: Buffer.from(match[2], "base64"),
  };
}

async function trySupabaseUpload(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });
    if (error) {
      // Bucket missing or storage not configured — fall through to disk
      console.warn("[card-images] Supabase upload:", error.message);
      return null;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn(
      "[card-images] Supabase unavailable:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function saveToPublicUploads(
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "cards");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/cards/${filename}`;
}

/**
 * Store profile or background image under a username-based filename.
 * Always overwrites the previous file for that username + kind.
 * Prefers Supabase Storage; falls back to public/uploads/cards.
 */
export async function saveCardImage(opts: {
  username: string;
  kind: CardImageKind;
  dataUrl?: string;
  buffer?: Buffer;
  contentType?: string;
}): Promise<{ path: string; url: string; filename: string }> {
  const filename = cardImageFilename(opts.username, opts.kind);

  let buffer = opts.buffer;
  let contentType = opts.contentType || "image/jpeg";

  if (!buffer && opts.dataUrl) {
    const parsed = dataUrlToBuffer(opts.dataUrl);
    buffer = parsed.buffer;
    contentType = parsed.contentType.startsWith("image/")
      ? parsed.contentType
      : "image/jpeg";
  }

  if (!buffer?.length) {
    throw new Error("No image data provided");
  }

  // Cap ~2.5 MB after crop
  if (buffer.length > 2.5 * 1024 * 1024) {
    throw new Error("Image is too large (max 2.5 MB)");
  }

  const remote = await trySupabaseUpload(filename, buffer, contentType);
  const storedPath = remote || (await saveToPublicUploads(filename, buffer));
  const url = withCacheBust(storedPath);

  return {
    filename,
    path: storedPath.split("?")[0],
    url,
  };
}

/** Map upload kind → cards table columns (file name only, no path). */
export function cardImageDbFields(
  kind: CardImageKind,
  filename: string,
): { logo?: string; bg_img?: string; bg_url?: string } {
  const name = filename.split("/").pop()?.split("?")[0]?.slice(0, 255) || filename;
  if (kind === "profile") {
    return { logo: name };
  }
  return { bg_img: name, bg_url: name };
}
