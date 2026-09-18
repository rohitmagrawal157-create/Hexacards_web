const DEFAULT_PUBLIC_APP = "https://hexacards-web.vercel.app";
/** Live site host — QR, NFC, dashboard, and public cards (currently Vercel). */
const DEFAULT_CANONICAL = DEFAULT_PUBLIC_APP;

const LEGACY_SITE_HOSTS = new Set([
  "hexacards.com",
  "www.hexacards.com",
]);

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

function hostnameOf(urlOrHost: string): string {
  const raw = urlOrHost.trim();
  if (!raw) return "";
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).hostname.toLowerCase();
  } catch {
    return raw
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .split(":")[0]
      .toLowerCase();
  }
}

export function isLegacyHexacardsHost(hostnameOrUrl: string): boolean {
  return LEGACY_SITE_HOSTS.has(hostnameOf(hostnameOrUrl));
}

/** Production print / QR / NFC base — never localhost, even if SITE_URL is local. */
export function getCanonicalSiteOrigin(): string {
  const canonical = process.env.NEXT_PUBLIC_CANONICAL_SITE_URL?.trim();
  if (canonical && !isLocalHost(canonical)) {
    // Old env still pointing at hexacards.com → use live Vercel app
    if (isLegacyHexacardsHost(canonical)) return DEFAULT_PUBLIC_APP;
    return stripTrailingSlash(canonical);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site && !isLocalHost(site)) {
    if (isLegacyHexacardsHost(site)) return DEFAULT_PUBLIC_APP;
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
    if (isLegacyHexacardsHost(shareEnv)) return DEFAULT_PUBLIC_APP;
    return stripTrailingSlash(shareEnv);
  }

  const siteEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteEnv && !isLocalHost(siteEnv)) {
    if (isLegacyHexacardsHost(siteEnv)) return DEFAULT_PUBLIC_APP;
    return stripTrailingSlash(siteEnv);
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (isVercelPreviewHost(hostname)) {
      return stripTrailingSlash(origin);
    }
    if (!isLocalHost(hostname) && hostname !== "" && !isLegacyHexacardsHost(hostname)) {
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
 * - canonical: live public host (hexacards-web.vercel.app)
 * - runtime: current domain (local preview navigation)
 * - share: public app host for WhatsApp / social (never localhost)
 */
export function buildPublicCardUrl(
  slug: string,
  mode: PublicCardUrlMode = "canonical",
): string {
  const clean = slug.trim().replace(/^\/+/, "").toLowerCase();
  const base =
    mode === "runtime"
      ? getRuntimeSiteOrigin()
      : mode === "share"
        ? getShareSiteOrigin()
        : getCanonicalSiteOrigin();
  return `${base}/${clean}`;
}

/** Relative in-app path — works on any host (/, /slug, /dashboard/edit-card). */
export function buildPublicCardPath(slug: string): string {
  return `/${slug.trim().replace(/^\/+/, "").toLowerCase()}`;
}

/**
 * Owner dashboard / edit bar public URL.
 * Prefer share host so View Card opens on hexacards-web.vercel.app.
 */
export function buildOwnerDisplayCardUrl(slug: string): string {
  return buildPublicCardUrl(slug, "share");
}

/**
 * URL used when someone taps Share (WhatsApp, social, copy link).
 * Always a public host — e.g. https://hexacards-web.vercel.app/akshay-wagh
 */
export function buildShareCardUrl(slug: string): string {
  return buildPublicCardUrl(slug, "share");
}

/**
 * Rewrite a stored card URL that may contain localhost or legacy hexacards.com
 * into the live public URL. Prefer the known slug when provided.
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
