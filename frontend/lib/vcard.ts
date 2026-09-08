import {
  DEFAULT_CARD_AVATAR,
  allContactMobiles,
  isDefaultLogoImage,
  phoneDigitsForLink,
  type HexaCardProfile,
} from "@/lib/card-profile";
import { resolveCardImageSrc } from "@/lib/card-images";
import { buildShareCardUrl } from "@/lib/site-url";
import { isReservedRootSegment } from "@/lib/reserved-routes";

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function vcardEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * Match legacy PHP exportCard() name split:
 * 1 word → first; 2 → first + last; 3+ → first two as first, rest as last.
 * Business name is appended to last name as " (Company)".
 */
function splitCardName(
  fullName: string,
  businessName?: string,
): { family: string; given: string; display: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  let given = "";
  let family = "";

  if (parts.length === 1) {
    given = parts[0];
  } else if (parts.length === 2) {
    given = parts[0];
    family = parts[1];
  } else if (parts.length >= 3) {
    given = `${parts[0]} ${parts[1]}`;
    family = parts.slice(2).join(" ");
  } else {
    given = "Contact";
  }

  const company = (businessName || "").trim();
  if (company) {
    family = family ? `${family} (${company})` : `(${company})`;
  }

  const display =
    [given, family].filter(Boolean).join(" ").trim() ||
    company ||
    "HexaCards Contact";

  return { given, family, display };
}

function fileSafeName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "hexacards-contact";
}

function slugFromPath(): string {
  if (typeof window === "undefined") return "";
  const seg =
    window.location.pathname.replace(/\/+$/, "").split("/").filter(Boolean)[0] ||
    "";
  if (!seg || isReservedRootSegment(seg)) return "";
  return seg.toLowerCase();
}

function slugFromShareUrl(url?: string): string {
  const raw = safeText(url);
  if (!raw) return "";
  try {
    const u = new URL(
      raw,
      typeof window !== "undefined"
        ? window.location.origin
        : "https://hexacards-web.vercel.app",
    );
    const seg =
      u.pathname.replace(/\/+$/, "").split("/").filter(Boolean)[0] || "";
    if (seg && !isReservedRootSegment(seg)) return seg.toLowerCase();
  } catch {
    // ignore
  }
  return "";
}

/** Resolve the public card slug used for /api/cards/vcard/[slug]. */
export function resolveCardVcardSlug(
  profile: HexaCardProfile,
  cardUrl?: string,
  explicitSlug?: string,
): string {
  const fromExplicit = safeText(explicitSlug).toLowerCase();
  if (fromExplicit && !isReservedRootSegment(fromExplicit)) return fromExplicit;

  return (
    slugFromPath() ||
    slugFromShareUrl(cardUrl) ||
    slugFromShareUrl(resolveVCardPageUrl(profile, cardUrl))
  );
}

/** Same-origin href for the server .vcf download (best for phones). */
export function cardVcardHref(slug: string): string {
  const clean = safeText(slug).toLowerCase();
  if (!clean || isReservedRootSegment(clean)) return "";
  return `/api/cards/vcard/${encodeURIComponent(clean)}`;
}

/** Public profile URL for the vCard (never localhost). */
export function resolveVCardPageUrl(
  profile: HexaCardProfile,
  explicitUrl?: string,
): string {
  const given = safeText(explicitUrl);
  if (
    given &&
    /^https?:\/\//i.test(given) &&
    !/localhost|127\.0\.0\.1/i.test(given)
  ) {
    return given;
  }

  const slug = slugFromPath() || slugFromShareUrl(given);
  if (slug) return buildShareCardUrl(slug);

  const fromName = safeText(profile.contact?.cardName);
  if (fromName) {
    const inferred = fromName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (inferred) return buildShareCardUrl(inferred);
  }

  return given || "";
}

function resolvePhotoUri(profile: HexaCardProfile): string {
  const raw = safeText(profile.appearance?.logoImage);
  if (!raw || isDefaultLogoImage(raw) || raw === DEFAULT_CARD_AVATAR) {
    return "";
  }
  const resolved = resolveCardImageSrc(raw, DEFAULT_CARD_AVATAR);
  if (
    !resolved ||
    resolved.startsWith("data:") ||
    resolved.startsWith("idb:") ||
    isDefaultLogoImage(resolved) ||
    resolved.split("?")[0].toLowerCase().endsWith(".svg")
  ) {
    return "";
  }
  if (/^https?:\/\//i.test(resolved)) return resolved.split("#")[0];
  if (resolved.startsWith("/") && typeof window !== "undefined") {
    return `${window.location.origin}${resolved}`;
  }
  return "";
}

/**
 * Build a vCard 3.0 matching the PHP Card exportCard() fields.
 */
export function buildVCard(profile: HexaCardProfile, cardUrl?: string): string {
  const contact = profile.contact || ({} as HexaCardProfile["contact"]);
  const nameRaw =
    safeText(contact.cardName) ||
    safeText(contact.businessName) ||
    "HexaCards Contact";
  const { given, family, display } = splitCardName(
    nameRaw,
    safeText(contact.businessName),
  );
  const country = safeText(contact.countryCode) || "IN";
  const mobiles = allContactMobiles(contact as HexaCardProfile["contact"]);
  const whatsapp = phoneDigitsForLink(country, safeText(contact.whatsapp));
  const email = safeText(contact.email);
  const website = safeText(contact.website);
  const websiteHref = website
    ? /^https?:\/\//i.test(website)
      ? website
      : `https://${website}`
    : "";
  const pageUrl = resolveVCardPageUrl(profile, cardUrl);
  const primaryUrl = websiteHref || pageUrl;
  const org = safeText(contact.businessName);
  const title = safeText(contact.title);
  const street = safeText(contact.address);
  const city = safeText(contact.city);
  const region = safeText(contact.state);
  const photoUri = resolvePhotoUri(profile);

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardEscape(display)}`,
    `N:${vcardEscape(family)};${vcardEscape(given)};;;`,
  ];

  if (org) lines.push(`ORG:${vcardEscape(org)}`);
  if (title) lines.push(`TITLE:${vcardEscape(title)}`);
  const mobileDigitsList = mobiles
    .map((m) => phoneDigitsForLink(country, m))
    .filter(Boolean);
  const seenTel = new Set<string>();
  mobileDigitsList.forEach((mobile, index) => {
    if (seenTel.has(mobile)) return;
    seenTel.add(mobile);
    const tel =
      mobile.length === 10
        ? `91${mobile}`
        : mobile.startsWith("91") && mobile.length > 10
          ? mobile
          : mobile;
    const type = index === 0 ? "CELL,VOICE" : "CELL";
    lines.push(`TEL;TYPE=${type}:+${tel}`);
  });
  if (whatsapp && !seenTel.has(whatsapp)) {
    const tel = whatsapp.length === 10 ? `91${whatsapp}` : whatsapp;
    lines.push(`TEL;TYPE=CELL:+${tel}`);
  }
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(email)}`);
  if (primaryUrl) lines.push(`URL:${vcardEscape(primaryUrl)}`);
  if (websiteHref && pageUrl && pageUrl !== websiteHref) {
    lines.push(`URL;TYPE=HOME:${vcardEscape(pageUrl)}`);
  }
  if (street || city || region) {
    lines.push(
      `ADR;TYPE=WORK:;;${vcardEscape(street)};${vcardEscape(city)};${vcardEscape(region)};;`,
    );
  }
  if (photoUri) lines.push(`PHOTO;VALUE=URI:${vcardEscape(photoUri)}`);
  lines.push("TZ:+05:30");
  lines.push("END:VCARD");

  return lines.join("\r\n");
}

function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  // iPadOS reports as Mac
  return (
    /Macintosh/i.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

async function deliverVcfFile(vcf: string, filename: string): Promise<void> {
  const safeName = filename.endsWith(".vcf") ? filename : `${filename}.vcf`;
  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });

  // Android / supporting browsers: share sheet → Contacts
  try {
    const file = new File([blob], safeName, { type: "text/vcard" });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };
    if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
      await nav.share({
        files: [file],
        title: safeName.replace(/\.vcf$/i, ""),
        text: "Save to contacts",
      });
      return;
    }
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") return;
    // fall through
  }

  const url = URL.createObjectURL(blob);

  // iOS Safari: navigating to the blob opens Add Contact (download attr is ignored)
  if (isAppleMobile()) {
    window.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function fetchServerVcard(slug: string): Promise<string | null> {
  const href = cardVcardHref(slug);
  if (!href) return null;
  try {
    const res = await fetch(href, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "text/vcard, text/x-vcard, text/plain, */*" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.includes("BEGIN:VCARD")) return null;
    return text;
  } catch {
    return null;
  }
}

/**
 * Save Contact — PHP-style .vcf download.
 * 1) Fetch server /api/cards/vcard/[slug] when slug is known
 * 2) Client-built .vcf fallback
 * 3) Share sheet → iOS location → desktop download
 */
export async function saveCardContactToDevice(
  profile: HexaCardProfile,
  cardUrl?: string,
  explicitSlug?: string,
): Promise<void> {
  try {
    const contact = profile?.contact;
    if (!contact) {
      window.alert("Contact details are not available to save.");
      return;
    }

    const hasPhone = allContactMobiles(contact).some((m) =>
      Boolean(
        phoneDigitsForLink(safeText(contact.countryCode) || "IN", m),
      ),
    );
    const hasEmail = Boolean(safeText(contact.email));
    const hasName = Boolean(
      safeText(contact.cardName) || safeText(contact.businessName),
    );

    if (!hasName && !hasPhone && !hasEmail) {
      window.alert("This card has no contact details to save yet.");
      return;
    }

    const slug = resolveCardVcardSlug(profile, cardUrl, explicitSlug);
    const name =
      safeText(contact.cardName) ||
      safeText(contact.businessName) ||
      "hexacards-contact";
    const filename = `${fileSafeName(slug || name)}.vcf`;

    // On iOS, a real navigation to the attachment URL is the most reliable path
    // (matches PHP generate_download). Only when we know the slug.
    if (slug && isAppleMobile()) {
      const href = cardVcardHref(slug);
      if (href) {
        window.location.assign(href);
        return;
      }
    }

    const serverVcf = slug ? await fetchServerVcard(slug) : null;
    const vcf = serverVcf || buildVCard(profile, cardUrl);
    await deliverVcfFile(vcf, filename);
  } catch (err) {
    console.error("[vcard] save failed:", err);
    // Last resort: client blob without share
    try {
      const vcf = buildVCard(profile, cardUrl);
      const name =
        safeText(profile.contact?.cardName) ||
        safeText(profile.contact?.businessName) ||
        "hexacards-contact";
      await deliverVcfFile(vcf, `${fileSafeName(name)}.vcf`);
    } catch {
      window.alert(
        err instanceof Error
          ? err.message
          : "Could not save contact. Please try again.",
      );
    }
  }
}
