import {
  DEFAULT_CARD_AVATAR,
  isDefaultLogoImage,
  phoneDigitsForLink,
  type HexaCardProfile,
} from "@/lib/card-profile";
import { resolveCardImageSrc } from "@/lib/card-images";
import { buildShareCardUrl } from "@/lib/site-url";
import { isReservedRootSegment } from "@/lib/reserved-routes";

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

/** Public profile URL for the vCard (never localhost). */
export function resolveVCardPageUrl(
  profile: HexaCardProfile,
  explicitUrl?: string,
): string {
  const given = explicitUrl?.trim();
  if (given && /^https?:\/\//i.test(given) && !/localhost|127\.0\.0\.1/i.test(given)) {
    return given;
  }

  const slug = slugFromPath();
  if (slug) return buildShareCardUrl(slug);

  const fromName = profile.contact.cardName.trim();
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
  const raw = profile.appearance.logoImage?.trim() || "";
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
 * Build a vCard 3.0 matching the PHP Card exportCard() fields:
 * name, company, title, mobile, email, address, URL, timezone.
 */
export function buildVCard(profile: HexaCardProfile, cardUrl?: string): string {
  const contact = profile.contact;
  const nameRaw =
    contact.cardName.trim() || contact.businessName.trim() || "HexaCards Contact";
  const { given, family, display } = splitCardName(
    nameRaw,
    contact.businessName,
  );
  const country = contact.countryCode || "IN";
  const mobile = phoneDigitsForLink(country, contact.mobile);
  const whatsapp = phoneDigitsForLink(country, contact.whatsapp);
  const email = contact.email.trim();
  const website = contact.website.trim();
  const websiteHref = website
    ? /^https?:\/\//i.test(website)
      ? website
      : `https://${website}`
    : "";
  // PHP: url = website if set, else digital card page URL
  const pageUrl = resolveVCardPageUrl(profile, cardUrl);
  const primaryUrl = websiteHref || pageUrl;
  const org = contact.businessName.trim();
  const title = contact.title.trim();
  const street = contact.address.trim();
  const city = contact.city.trim();
  const region = contact.state.trim();
  const photoUri = resolvePhotoUri(profile);

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardEscape(display)}`,
    `N:${vcardEscape(family)};${vcardEscape(given)};;;`,
  ];

  if (org) lines.push(`ORG:${vcardEscape(org)}`);
  if (title) lines.push(`TITLE:${vcardEscape(title)}`);
  if (mobile) lines.push(`TEL;TYPE=CELL,VOICE:+${mobile}`);
  if (whatsapp && whatsapp !== mobile) {
    lines.push(`TEL;TYPE=CELL:+${whatsapp}`);
  }
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(email)}`);
  if (primaryUrl) lines.push(`URL:${vcardEscape(primaryUrl)}`);
  // Keep digital card URL as note/url when website already took the primary slot
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

function triggerVcfDownload(vcf: string, filename: string) {
  const blob = new Blob([vcf], {
    type: "text/x-vcard;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Save Contact — same outcome as PHP vcard->generate_download():
 * produce a .vcf and open/download it so the phone can Add Contact.
 */
export async function saveCardContactToDevice(
  profile: HexaCardProfile,
  cardUrl?: string,
): Promise<void> {
  const hasPhone = Boolean(
    phoneDigitsForLink(
      profile.contact.countryCode || "IN",
      profile.contact.mobile,
    ),
  );
  const hasEmail = Boolean(profile.contact.email.trim());
  const hasName = Boolean(
    profile.contact.cardName.trim() || profile.contact.businessName.trim(),
  );

  if (!hasName && !hasPhone && !hasEmail) {
    window.alert("This card has no contact details to save yet.");
    return;
  }

  const vcf = buildVCard(profile, cardUrl);
  const name =
    profile.contact.cardName.trim() ||
    profile.contact.businessName.trim() ||
    "hexacards-contact";
  const filename = `${fileSafeName(name)}.vcf`;

  // iOS Safari: open .vcf → Add Contact sheet
  if (isAppleMobile()) {
    try {
      window.location.href = `data:text/x-vcard;charset=utf-8,${encodeURIComponent(vcf)}`;
      return;
    } catch {
      // fall through to blob download
    }
  }

  // Android / desktop: download .vcf (PHP generate_download)
  triggerVcfDownload(vcf, filename);
}
