import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  DEFAULT_CARD_IMAGES_BUCKET,
  getSupabaseCardImagePublicUrl,
} from "@/lib/card-images";
import { sanitizeCardUsername } from "@/lib/server/card-image-storage";

const BUCKET =
  process.env.CARD_IMAGES_BUCKET?.trim() || DEFAULT_CARD_IMAGES_BUCKET;

const SETUP_HINT =
  'Allow PDF/docs on the "card-images" bucket (see frontend/sql/card-brochure-storage.sql).';

const MAX_BYTES = 5 * 1024 * 1024;

function isServerlessDeploy(): boolean {
  return Boolean(process.env.VERCEL);
}

function allowLocalDiskFallback(): boolean {
  return !isServerlessDeploy() && process.env.NODE_ENV !== "production";
}

function extensionForBrochure(fileName: string, contentType?: string): string {
  const fromName = fileName.split(".").pop()?.toLowerCase() || "";
  if (["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  const t = (contentType || "").toLowerCase();
  if (t.includes("pdf")) return "pdf";
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("wordprocessingml") || t.includes("docx")) return "docx";
  if (t.includes("msword")) return "doc";
  return "pdf";
}

export function cardBrochureFilename(
  username: string,
  fileName: string,
  contentType?: string,
): string {
  const base = sanitizeCardUsername(username);
  const ext = extensionForBrochure(fileName, contentType);
  return `${base}-brochure.${ext}`;
}

/** Resolve stored brochure ref (filename or URL) to a public download URL. */
export function resolveBrochurePublicUrl(
  stored: string | null | undefined,
): string | null {
  const raw = String(stored ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw.split("#")[0];
  if (raw.startsWith("/uploads/")) return raw.split("?")[0];

  const name = raw.split("/").pop()?.split("?")[0] || "";
  if (!name) return null;

  // Storage filename pattern or any uploaded brochure name with extension
  if (/-brochure\./i.test(name) || /\.(pdf|docx?|png|jpe?g|webp)$/i.test(name)) {
    const remote = getSupabaseCardImagePublicUrl(name, BUCKET);
    if (remote) return remote;
    return `/uploads/cards/${name}`;
  }

  return null;
}

export async function saveCardBrochure(opts: {
  username: string;
  buffer: Buffer;
  fileName: string;
  contentType?: string;
}): Promise<{ filename: string; url: string; path: string }> {
  if (!opts.buffer?.length) throw new Error("No brochure file provided");
  if (opts.buffer.length > MAX_BYTES) {
    throw new Error("Brochure must be 5 MB or smaller");
  }

  const filename = cardBrochureFilename(
    opts.username,
    opts.fileName,
    opts.contentType,
  );
  const contentType = opts.contentType || "application/pdf";

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(BUCKET).upload(filename, opts.buffer, {
      contentType,
      upsert: true,
      cacheControl: "60",
    });
    if (error) {
      throw new Error(
        isServerlessDeploy()
          ? `Brochure upload failed: ${error.message}. ${SETUP_HINT}`
          : `Brochure upload failed: ${error.message}`,
      );
    }
    const publicUrl = getSupabaseCardImagePublicUrl(filename, BUCKET);
    if (!publicUrl) {
      throw new Error(`Could not build brochure URL. ${SETUP_HINT}`);
    }
    const url = `${publicUrl.split("?")[0]}?v=${Date.now()}`;
    return { filename, path: publicUrl, url };
  } catch (err) {
    if (!allowLocalDiskFallback()) {
      throw err instanceof Error ? err : new Error("Brochure upload failed");
    }
    console.warn(
      "[brochure] Supabase upload failed — local fallback:",
      err instanceof Error ? err.message : err,
    );
    const dir = path.join(process.cwd(), "public", "uploads", "cards");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), opts.buffer);
    const localPath = `/uploads/cards/${filename}`;
    return {
      filename,
      path: localPath,
      url: `${localPath}?v=${Date.now()}`,
    };
  }
}

export async function clearCardBrochureFile(filename: string): Promise<void> {
  const name = filename.split("/").pop()?.split("?")[0];
  if (!name || !/-brochure\./i.test(name)) return;
  try {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(BUCKET).remove([name]);
  } catch {
    // ignore — DB clear is enough for UX
  }
}
