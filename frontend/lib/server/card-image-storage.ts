import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSupabaseCardImagePublicUrl, DEFAULT_CARD_IMAGES_BUCKET } from "@/lib/card-images";

export type CardImageKind = "profile" | "background" | "order-logo";

const BUCKET =
  process.env.CARD_IMAGES_BUCKET?.trim() || DEFAULT_CARD_IMAGES_BUCKET;

const SETUP_HINT =
  'Create a public Supabase Storage bucket named "card-images" (see frontend/sql/card-images-storage.sql) and set SUPABASE_SERVICE_ROLE_KEY on Vercel.';

function isServerlessDeploy(): boolean {
  return Boolean(process.env.VERCEL);
}

function allowLocalDiskFallback(): boolean {
  return !isServerlessDeploy() && process.env.NODE_ENV !== "production";
}

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
function extensionForContentType(contentType?: string): string {
  const t = (contentType || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  if (t.includes("gif")) return "gif";
  return "jpg";
}

export function cardImageFilename(
  username: string,
  kind: CardImageKind,
  contentType?: string,
): string {
  const base = sanitizeCardUsername(username);
  if (kind === "order-logo") {
    return `${base}-order-logo.${extensionForContentType(contentType)}`;
  }
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

async function uploadToSupabase(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType,
    upsert: true,
    // Short TTL — same filename is overwritten on each upload
    cacheControl: "60",
  });

  if (error) {
    throw new Error(
      isServerlessDeploy()
        ? `Supabase Storage upload failed: ${error.message}. ${SETUP_HINT}`
        : `Supabase Storage upload failed: ${error.message}`,
    );
  }

  const publicUrl = getSupabaseCardImagePublicUrl(filename, BUCKET);
  if (!publicUrl) {
    throw new Error(
      `Supabase upload succeeded but public URL could not be built. ${SETUP_HINT}`,
    );
  }

  return publicUrl;
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
 * Production (Vercel): Supabase Storage only — no local disk writes.
 * Local dev: Supabase first, optional public/uploads/cards fallback.
 */
export async function saveCardImage(opts: {
  username: string;
  kind: CardImageKind;
  dataUrl?: string;
  buffer?: Buffer;
  contentType?: string;
}): Promise<{ path: string; url: string; filename: string }> {
  let buffer = opts.buffer;
  let contentType = opts.contentType || "image/jpeg";

  if (!buffer && opts.dataUrl) {
    const parsed = dataUrlToBuffer(opts.dataUrl);
    buffer = parsed.buffer;
    contentType = parsed.contentType.startsWith("image/")
      ? parsed.contentType
      : "image/jpeg";
  }

  const filename = cardImageFilename(opts.username, opts.kind, contentType);

  if (!buffer?.length) {
    throw new Error("No image data provided");
  }

  // Cap ~2.5 MB after crop
  if (buffer.length > 2.5 * 1024 * 1024) {
    throw new Error("Image is too large (max 2.5 MB)");
  }

  try {
    const publicUrl = await uploadToSupabase(filename, buffer, contentType);
    const url = withCacheBust(publicUrl);
    return {
      filename,
      path: publicUrl,
      url,
    };
  } catch (err) {
    if (!allowLocalDiskFallback()) {
      throw err instanceof Error
        ? err
        : new Error(`Card image upload failed. ${SETUP_HINT}`);
    }

    console.warn(
      "[card-images] Supabase upload failed — using local disk fallback:",
      err instanceof Error ? err.message : err,
    );
    const localPath = await saveToPublicUploads(filename, buffer);
    const url = withCacheBust(localPath);
    return {
      filename,
      path: localPath,
      url,
    };
  }
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
  if (kind === "order-logo") {
    return {};
  }
  return { bg_img: name, bg_url: name };
}
