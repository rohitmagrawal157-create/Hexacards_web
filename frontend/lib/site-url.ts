const DEFAULT_CANONICAL = "https://hexacards.com";

/** Production share link base (QR, NFC, SMS, DB). */
export function getCanonicalSiteOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_CANONICAL_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (fromEnv || DEFAULT_CANONICAL).replace(/\/$/, "");
}

/** Current deployment origin — Vercel preview or browser. */
export function getRuntimeSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return getCanonicalSiteOrigin();
}

export function isVercelPreviewHost(hostname: string): boolean {
  return hostname.endsWith(".vercel.app");
}

/** True when viewing on a Vercel preview URL (client or server). */
export function isPreviewDeployment(): boolean {
  if (typeof window !== "undefined") {
    return isVercelPreviewHost(window.location.hostname);
  }
  const vercel = process.env.VERCEL_URL?.trim() || "";
  return isVercelPreviewHost(vercel.replace(/^https?:\/\//, ""));
}

export type PublicCardUrlMode = "canonical" | "runtime";

/**
 * Build a full public card URL.
 * - canonical: always hexacards.com (share / QR / production)
 * - runtime: current domain (Vercel testing or local dev)
 */
export function buildPublicCardUrl(
  slug: string,
  mode: PublicCardUrlMode = "canonical",
): string {
  const clean = slug.trim().replace(/^\/+/, "");
  const base =
    mode === "runtime" ? getRuntimeSiteOrigin() : getCanonicalSiteOrigin();
  return `${base}/${clean}`;
}

/** Relative in-app path — works on hexacards.com and *.vercel.app */
export function buildPublicCardPath(slug: string): string {
  return `/${slug.trim().replace(/^\/+/, "")}`;
}

/** Owner dashboard / edit bar — show test URL on Vercel, production URL otherwise. */
export function buildOwnerDisplayCardUrl(slug: string): string {
  return buildPublicCardUrl(slug, isPreviewDeployment() ? "runtime" : "canonical");
}
