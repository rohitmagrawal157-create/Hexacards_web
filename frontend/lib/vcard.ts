import {
  DEFAULT_CARD_AVATAR,
  cardPublicUrl,
  isDefaultLogoImage,
  phoneDigitsForLink,
  type HexaCardProfile,
} from "@/lib/card-profile";

function vcardEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function splitName(fullName: string): { family: string; given: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { family: "", given: "Contact" };
  if (parts.length === 1) return { family: "", given: parts[0] };
  return {
    given: parts[0],
    family: parts.slice(1).join(" "),
  };
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

function currentPublicCardUrl(): string {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/super-admin") ||
    path.startsWith("/login") ||
    path.startsWith("/checkout") ||
    path.startsWith("/design-your-card")
  ) {
    return "";
  }
  if (path === "/" || path.split("/").filter(Boolean).length !== 1) {
    return "";
  }
  return `${window.location.origin}${path}`;
}

function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Build a vCard 3.0 file the phone Contacts app can import. */
export function buildVCard(profile: HexaCardProfile, cardUrl?: string): string {
  const contact = profile.contact;
  const name =
    contact.cardName.trim() || contact.businessName.trim() || "HexaCards Contact";
  const { given, family } = splitName(name);
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
  const org = contact.businessName.trim();
  const title = contact.title.trim();
  const street = contact.address.trim();
  const city = contact.city.trim();
  const region = contact.state.trim();
  const pageUrl = cardUrl?.trim() || currentPublicCardUrl() || cardPublicUrl(profile);
  const photo = profile.appearance.logoImage?.trim() || "";
  const photoUri =
    photo &&
    !isDefaultLogoImage(photo) &&
    photo !== DEFAULT_CARD_AVATAR &&
    /^https?:\/\//i.test(photo)
      ? photo
      : "";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardEscape(name)}`,
    `N:${vcardEscape(family)};${vcardEscape(given)};;;`,
  ];

  if (org) lines.push(`ORG:${vcardEscape(org)}`);
  if (title) lines.push(`TITLE:${vcardEscape(title)}`);
  if (mobile) lines.push(`TEL;TYPE=CELL,VOICE:+${mobile}`);
  if (whatsapp && whatsapp !== mobile) {
    lines.push(`TEL;TYPE=CELL:+${whatsapp}`);
  }
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(email)}`);
  if (websiteHref) lines.push(`URL:${vcardEscape(websiteHref)}`);
  if (pageUrl) lines.push(`URL:${vcardEscape(pageUrl)}`);
  if (street || city || region) {
    lines.push(
      `ADR;TYPE=WORK:;;${vcardEscape(street)};${vcardEscape(city)};${vcardEscape(region)};;`,
    );
  }
  if (photoUri) lines.push(`PHOTO;VALUE=URI:${vcardEscape(photoUri)}`);
  lines.push("END:VCARD");

  return lines.join("\r\n");
}

function triggerVcfDownload(vcf: string, filename: string) {
  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Save this digital card into the phone Contacts app.
 * iOS: opens Add Contact from a .vcf file. Android/desktop: downloads .vcf to import.
 */
export async function saveCardContactToDevice(
  profile: HexaCardProfile,
  cardUrl?: string,
): Promise<void> {
  const vcf = buildVCard(profile, cardUrl);
  const name =
    profile.contact.cardName.trim() ||
    profile.contact.businessName.trim() ||
    "hexacards-contact";
  const filename = `${fileSafeName(name)}.vcf`;

  const file = new File([vcf], filename, { type: "text/vcard" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: name,
        text: `Save ${name} to contacts`,
      });
      return;
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
    }
  }

  if (isAppleMobile()) {
    window.location.href = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcf)}`;
    return;
  }

  triggerVcfDownload(vcf, filename);
}
