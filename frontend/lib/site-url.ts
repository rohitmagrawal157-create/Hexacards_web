const DEFAULT_CANONICAL = "https://hexacards.com";
/** Live web app used for WhatsApp / social shares while on Vercel */
const DEFAULT_PUBLIC_APP = "https://hexacards-web.vercel.app";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** True for localhost / 127.0.0.1 (hostname or full URL). */
export function isLocalHost(hostnameOrUrl: string): boolean {
  const value = hostnameOrUrl
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
  return value === "localhost" || value === "127.0.0.1";
}

/** Production print / QR / NFC base — never localhost, even if SITE_URL is local. */
export function getCanonicalSiteOrigin(): string {
  const canonical = process.env.NEXT_PUBLIC_CANONICAL_SITE_URL?.trim();
  if (canonical && !isLocalHost(canonical)) {
    return stripTrailingSlash(canonical);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site && !isLocalHost(site)) {
    return stripTrailingSlash(site);
  }
  return DEFAULT_CANONICAL;
}

/** Current deployment origin — Vercel preview or browser. */
export function getRuntimeSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return stripTrailingSlash(window.location.origin);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return getCanonicalSiteOrigin();
}

/**
 * Public origin for WhatsApp / Share links.
 * Never uses localhost — prefers env, then current *.vercel.app, then live app.
 */
export function getShareSiteOrigin(): string {
  const shareEnv = process.env.NEXT_PUBLIC_SHARE_SITE_URL?.trim();
  if (shareEnv && !isLocalHost(shareEnv)) {
    return stripTrailingSlash(shareEnv);
  }

  const siteEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteEnv && !isLocalHost(siteEnv)) {
    return stripTrailingSlash(siteEnv);
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (isVercelPreviewHost(hostname)) {
      return stripTrailingSlash(origin);
    }
    if (!isLocalHost(hostname) && hostname !== "") {
      // Real custom domain (e.g. hexacards.com)
      return stripTrailingSlash(origin);
    }
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    if (!isLocalHost(host)) return `https://${host}`;
  }

  return DEFAULT_PUBLIC_APP;
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

export type PublicCardUrlMode = "canonical" | "runtime" | "share";

/**
 * Build a full public card URL.
 * - canonical: hexacards.com (QR / NFC / production print)
 * - runtime: current domain (local preview navigation)
 * - share: public app host for WhatsApp / social (never localhost)
 */
export function buildPublicCardUrl(
  slug: string,
  mode: PublicCardUrlMode = "canonical",
): string {
  const clean = slug.trim().replace(/^\/+/, "");
  const base =
    mode === "runtime"
      ? getRuntimeSiteOrigin()
      : mode === "share"
        ? getShareSiteOrigin()
        : getCanonicalSiteOrigin();
  return `${base}/${clean}`;
}

/** Relative in-app path — works on hexacards.com and *.vercel.app */
export function buildPublicCardPath(slug: string): string {
  return `/${slug.trim().replace(/^\/+/, "")}`;
}

/** Owner dashboard / edit bar — show test URL on Vercel, production URL otherwise. */
export function buildOwnerDisplayCardUrl(slug: string): string {
  return buildPublicCardUrl(
    slug,
    isPreviewDeployment() ||
      (typeof window !== "undefined" && isLocalHost(window.location.hostname))
      ? "share"
      : "canonical",
  );
}

/**
 * URL used when someone taps Share (WhatsApp, social, copy link).
 * Always a public host — e.g. https://hexacards-web.vercel.app/akshay-wagh
 */
export function buildShareCardUrl(slug: string): string {
  return buildPublicCardUrl(slug, "share");
}

/**
 * Rewrite a stored card URL that may contain localhost (from local checkout)
 * into a public URL. Prefer the known slug when provided.
 */
export function normalizeStoredCardUrl(
  storedUrl: string | null | undefined,
  slug?: string | null,
  mode: PublicCardUrlMode = "canonical",
): string {
  const fromSlug = (slug || "").trim().replace(/^\/+/, "");
  let fromUrl = "";
  const raw = (storedUrl || "").trim();
  if (raw) {
    try {
      const parsed = new URL(raw, DEFAULT_CANONICAL);
      fromUrl = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/")[0] || "";
    } catch {
      fromUrl = raw.replace(/^\/+|\/+$/g, "").split("/")[0] || "";
    }
  }
  const cleanSlug = fromSlug || fromUrl;
  if (!cleanSlug) return getCanonicalSiteOrigin();
  return buildPublicCardUrl(cleanSlug, mode);
}
