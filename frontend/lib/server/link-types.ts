/** Supabase `links` table — one row per link type per card */

export const LINK_TYPES = [
  "website",
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "youtube",
  "google_review",
  "telegram",
  "snapchat",
  "pinterest",
  "tripadvisor",
  "brochure",
] as const;

export type LinkType = (typeof LINK_TYPES)[number];

export type LinkRow = {
  link_id: number | string;
  card_id: number | string;
  link_type: string;
  link_url: string;
  link_label: string | null;
  sort_order: number;
  status: number;
  date_time: string;
  update_time: string;
};

export type LinkDto = {
  linkId: number;
  cardId: number;
  linkType: LinkType | string;
  linkUrl: string;
  linkLabel: string | null;
  sortOrder: number;
  status: boolean;
  dateTime: string;
  updateTime: string;
};

/** Flat link fields merged onto CardDto for the existing frontend */
export type CardLinkFields = {
  website: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  googleUrl: string | null;
  telegramUrl: string | null;
  snapchatUrl: string | null;
  pinterestUrl: string | null;
  tripadvisorUrl: string | null;
  brochure: string | null;
  links?: LinkDto[];
};

export const LINK_COLS =
  "link_id, card_id, link_type, link_url, link_label, sort_order, status, date_time, update_time" as const;

export const LINK_TYPE_SORT: Record<LinkType, number> = {
  website: 10,
  facebook: 20,
  instagram: 30,
  linkedin: 40,
  twitter: 50,
  youtube: 60,
  google_review: 70,
  telegram: 80,
  snapchat: 90,
  pinterest: 100,
  tripadvisor: 110,
  brochure: 120,
};

export function mapLink(row: LinkRow): LinkDto {
  return {
    linkId: Number(row.link_id),
    cardId: Number(row.card_id),
    linkType: row.link_type,
    linkUrl: row.link_url ?? "",
    linkLabel: row.link_label ?? null,
    sortOrder: Number(row.sort_order) || 0,
    status: Number(row.status) === 1,
    dateTime: row.date_time,
    updateTime: row.update_time,
  };
}

export function isLinkType(value: string): value is LinkType {
  return (LINK_TYPES as readonly string[]).includes(value);
}
