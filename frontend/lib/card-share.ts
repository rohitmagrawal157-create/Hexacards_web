import { cardPublicUrl, phoneDigitsForLink, type HexaCardProfile } from "@/lib/card-profile";
import { isReservedRootSegment } from "@/lib/reserved-routes";
import { buildShareCardUrl, getShareSiteOrigin } from "@/lib/site-url";

/** Canonical share copy for WhatsApp, Email, and other apps. */
export function buildCardShareText(shareUrl: string): string {
  const url = shareUrl.trim();
  return [
    "Hi, Here's my digital business card",
    "Explore my work, offerings and connect with me instantly",
    url,
  ].join("\n");
}

export function buildCardShareEmailSubject(cardName?: string): string {
  const name = cardName?.trim();
  return name
    ? `${name} — digital business card`
    : "My digital business card";
}

export function buildCardShareTweet(shareUrl: string): string {
  return `Here's my digital business card — explore my work and connect with me instantly\n${shareUrl.trim()}`;
}

function slugFromUrlOrPath(shareUrl: string): string {
  const raw = shareUrl.trim();
  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(raw || window.location.href, window.location.origin);
      const slug = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/")[0] || "";
      if (slug && !isReservedRootSegment(slug)) return slug;
    } catch {
      // fall through
    }
    const pathSlug =
      window.location.pathname.replace(/\/+$/, "").split("/").filter(Boolean)[0] ||
      "";
    if (pathSlug && !isReservedRootSegment(pathSlug)) return pathSlug;
  }

  try {
    const parsed = new URL(raw);
    const slug = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/")[0] || "";
    if (slug && !isReservedRootSegment(slug)) return slug;
  } catch {
    const slug = raw.replace(/^\/+|\/+$/g, "").split("/")[0] || "";
    if (slug && !isReservedRootSegment(slug)) return slug;
  }
  return "";
}

/**
 * Rewrite any card URL (localhost / hexacards.com / etc.) to the public
 * share host, e.g. https://hexacards-web.vercel.app/akshay-wagh
 */
export function rewriteShareUrlToCurrentOrigin(shareUrl: string): string {
  const slug = slugFromUrlOrPath(shareUrl);
  if (slug) return buildShareCardUrl(slug);

  const raw = shareUrl.trim();
  if (raw) {
    try {
      const parsed = new URL(raw, getShareSiteOrigin());
      return `${getShareSiteOrigin()}${parsed.pathname}`.replace(/\/$/, "");
    } catch {
      return raw;
    }
  }
  return getShareSiteOrigin();
}

/** Prefer the live public profile URL for WhatsApp / social share. */
export function resolveCardShareUrl(
  profile?: HexaCardProfile | null,
  explicitUrl?: string,
): string {
  if (typeof window !== "undefined") {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const slug = path.split("/").filter(Boolean)[0] || "";
    if (slug && !isReservedRootSegment(slug)) {
      return buildShareCardUrl(slug);
    }
  }

  const given = explicitUrl?.trim();
  if (given) return rewriteShareUrlToCurrentOrigin(given);
  if (profile) return cardPublicUrl(profile);
  return "";
}

export function openWhatsAppCardShare(opts: {
  shareUrl: string;
  toNumber?: string;
  countryCode?: string;
}): void {
  const shareUrl = rewriteShareUrlToCurrentOrigin(opts.shareUrl);
  const text = buildCardShareText(shareUrl);
  const digits = (opts.toNumber || "").replace(/\D/g, "");
  if (digits) {
    if (digits.length !== 10) {
      window.alert("Enter a 10-digit WhatsApp number.");
      return;
    }
    const dial = phoneDigitsForLink(opts.countryCode || "IN", digits);
    window.open(
      `https://wa.me/${dial}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }
  window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}
