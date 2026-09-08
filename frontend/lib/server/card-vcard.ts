import type { CardDto } from "@/lib/server/card-types";
import { getShareSiteOrigin } from "@/lib/site-url";

function vcardEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

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

function digitsPhone(raw: string | null | undefined): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length >= 10) return d.slice(-10);
  return d;
}

function allMobilesFromCard(card: CardDto): string[] {
  const primary = digitsPhone(card.mobile);
  const extras = (card.extraMobiles ?? [])
    .map((m) => digitsPhone(m))
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of [primary, ...extras]) {
    if (!d || seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  return out;
}

/** Build vCard 3.0 from a Supabase card row (PHP exportCard equivalent). */
export function buildVCardFromCardDto(card: CardDto): {
  vcf: string;
  filename: string;
} {
  const nameRaw =
    card.cardName?.trim() ||
    card.businessName?.trim() ||
    "HexaCards Contact";
  const { given, family, display } = splitCardName(
    nameRaw,
    card.businessName || undefined,
  );
  const mobiles = allMobilesFromCard(card);
  const whatsapp = digitsPhone(card.whatsapp);
  const email = (card.email || "").trim();
  const website = (card.website || "").trim();
  const websiteHref = website
    ? /^https?:\/\//i.test(website)
      ? website
      : `https://${website}`
    : "";
  const pageUrl = `${getShareSiteOrigin()}/${card.unicCardName}`;
  const primaryUrl = websiteHref || pageUrl;
  const org = (card.businessName || "").trim();
  const title = (card.jobName || "").trim();
  const street = (card.address || "").trim();
  const code = (card.code || "91").replace(/\D/g, "") || "91";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardEscape(display)}`,
    `N:${vcardEscape(family)};${vcardEscape(given)};;;`,
  ];

  if (org) lines.push(`ORG:${vcardEscape(org)}`);
  if (title) lines.push(`TITLE:${vcardEscape(title)}`);
  const seenTel = new Set<string>();
  mobiles.forEach((mobile, index) => {
    if (seenTel.has(mobile)) return;
    seenTel.add(mobile);
    const type = index === 0 ? "CELL,VOICE" : "CELL";
    lines.push(`TEL;TYPE=${type}:+${code}${mobile}`);
  });
  if (whatsapp && !seenTel.has(whatsapp)) {
    lines.push(`TEL;TYPE=CELL:+${code}${whatsapp}`);
  }
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(email)}`);
  if (primaryUrl) lines.push(`URL:${vcardEscape(primaryUrl)}`);
  if (websiteHref && pageUrl !== websiteHref) {
    lines.push(`URL;TYPE=HOME:${vcardEscape(pageUrl)}`);
  }
  if (street) {
    lines.push(`ADR;TYPE=WORK:;;${vcardEscape(street)};;;;`);
  }
  lines.push("TZ:+05:30");
  lines.push("END:VCARD");

  const safe =
    card.unicCardName?.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80) ||
    "hexacards-contact";

  return {
    vcf: lines.join("\r\n"),
    filename: `${safe}.vcf`,
  };
}
