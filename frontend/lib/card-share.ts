import { cardPublicUrl, phoneDigitsForLink, type HexaCardProfile } from "@/lib/card-profile";
import { isReservedRootSegment } from "@/lib/reserved-routes";
import { buildPublicCardUrl } from "@/lib/site-url";

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

/** Prefer the live public slug on a card page; otherwise the profile share URL. */
export function resolveCardShareUrl(
  profile?: HexaCardProfile | null,
  explicitUrl?: string,
): string {
  const given = explicitUrl?.trim();
  if (given) return given;

  if (typeof window !== "undefined") {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const slug = path.split("/").filter(Boolean)[0] || "";
    if (slug && !isReservedRootSegment(slug)) {
      return buildPublicCardUrl(slug, "canonical");
    }
  }

  if (profile) return cardPublicUrl(profile);
  return "";
}

export function openWhatsAppCardShare(opts: {
  shareUrl: string;
  toNumber?: string;
  countryCode?: string;
}): void {
  const text = buildCardShareText(opts.shareUrl);
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
