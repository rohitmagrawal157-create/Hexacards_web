/** Supabase `cards` table row */
export type CardRow = {
  card_id: number | string;
  unic_card_name: string;
  card_name: string;
  job_name: string;
  business_name: string;
  user_id: number | string;
  logo: string | null;
  bg_img: string | null;
  bg_url: string | null;
  theme_id: number;
  accent_color?: string | null;
  mobile: string;
  email: string | null;
  website: string | null;
  code: string;
  whatsapp: string | null;
  state_id: number | string | null;
  city_id: number | string | null;
  address: string | null;
  about: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  google_url: string | null;
  about_company: string | null;
  services: string | null;
  brochure: string | null;
  page_view: number | string;
  start_date: string | null;
  end_date: string | null;
  date_time: string;
  update_time: string;
  status: number;
  /** Comma-separated extra 10-digit mobiles (last column) */
  extra_mobiles?: string | null;
};

export type CardDto = {
  cardId: number;
  unicCardName: string;
  cardName: string;
  jobName: string;
  businessName: string;
  userId: number;
  logo: string | null;
  bgImg: string | null;
  bgUrl: string | null;
  themeId: number;
  /** Dashboard Appearance accent (e.g. #141414) */
  accentColor?: string | null;
  mobile: string;
  /** Extra contact numbers stored in cards.extra_mobiles */
  extraMobiles?: string[];
  email: string | null;
  website: string | null;
  code: string;
  whatsapp: string | null;
  stateId: number | null;
  cityId: number | null;
  address: string | null;
  about: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  googleUrl: string | null;
  telegramUrl?: string | null;
  snapchatUrl?: string | null;
  pinterestUrl?: string | null;
  tripadvisorUrl?: string | null;
  aboutCompany: string | null;
  services: string | null;
  brochure: string | null;
  pageView: number;
  startDate: string | null;
  endDate: string | null;
  dateTime: string;
  updateTime: string;
  status: boolean;
  /** Populated from `links` table when available */
  links?: import("@/lib/server/link-types").LinkDto[];
};

export type CardCreateBody = {
  unicCardName?: string;
  unic_card_name?: string;
  cardName?: string;
  card_name?: string;
  jobName?: string;
  job_name?: string;
  businessName?: string;
  business_name?: string;
  userId?: number;
  user_id?: number;
  /** Resolve user_id from users.mobile when userId omitted */
  ownerPhone?: string;
  mobileNumber?: string;
  logo?: string | null;
  bgImg?: string | null;
  bg_img?: string | null;
  bgUrl?: string | null;
  bg_url?: string | null;
  themeId?: number;
  theme_id?: number;
  accentColor?: string | null;
  accent_color?: string | null;
  mobile?: string;
  /** Extra mobiles — array or comma-separated string */
  extraMobiles?: string[] | string | null;
  extra_mobiles?: string[] | string | null;
  email?: string | null;
  website?: string | null;
  code?: string;
  whatsapp?: string | null;
  stateId?: number | null;
  state_id?: number | null;
  cityId?: number | null;
  city_id?: number | null;
  address?: string | null;
  about?: string | null;
  facebookUrl?: string | null;
  facebook_url?: string | null;
  instagramUrl?: string | null;
  instagram_url?: string | null;
  linkedinUrl?: string | null;
  linkedin_url?: string | null;
  twitterUrl?: string | null;
  twitter_url?: string | null;
  youtubeUrl?: string | null;
  youtube_url?: string | null;
  googleUrl?: string | null;
  google_url?: string | null;
  telegramUrl?: string | null;
  telegram_url?: string | null;
  snapchatUrl?: string | null;
  snapchat_url?: string | null;
  pinterestUrl?: string | null;
  pinterest_url?: string | null;
  tripadvisorUrl?: string | null;
  tripadvisor_url?: string | null;
  aboutCompany?: string | null;
  about_company?: string | null;
  services?: string | null;
  brochure?: string | null;
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
  status?: boolean | number;
};

export type CardUpdateBody = CardCreateBody;

const MAX_EXTRA_MOBILES_DB = 4;

/** Normalize DB / API extra_mobiles into unique 10-digit numbers. */
export function parseExtraMobilesDb(
  value: string | string[] | null | undefined,
): string[] {
  const parts: string[] = [];
  if (Array.isArray(value)) {
    for (const item of value) parts.push(String(item ?? ""));
  } else if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          for (const item of parsed) parts.push(String(item ?? ""));
        }
      } catch {
        parts.push(...trimmed.split(/[,|;]+/));
      }
    } else {
      parts.push(...trimmed.split(/[,|;]+/));
    }
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const digits = raw.replace(/\D/g, "").slice(-10);
    if (!digits || seen.has(digits)) continue;
    seen.add(digits);
    out.push(digits);
    if (out.length >= MAX_EXTRA_MOBILES_DB) break;
  }
  return out;
}

export function serializeExtraMobilesDb(
  value: string | string[] | null | undefined,
): string {
  return parseExtraMobilesDb(value).join(",");
}

/**
 * Primary stays in `mobile`; extras in `extra_mobiles`.
 * Also migrates legacy `primary|extra` packed into mobile.
 */
export function resolveCardMobiles(
  mobileRaw: string | null | undefined,
  extraRaw?: string | string[] | null,
): { mobile: string; extraMobiles: string[] } {
  const fromCol = parseExtraMobilesDb(extraRaw);
  const text = String(mobileRaw ?? "").trim();
  if (text.includes("|")) {
    const parts = text
      .split("|")
      .map((p) => p.replace(/\D/g, "").slice(-10))
      .filter(Boolean);
    const primary = parts[0] || "";
    const legacyExtras = parts.slice(1);
    const extras =
      fromCol.length > 0
        ? fromCol
        : parseExtraMobilesDb(legacyExtras);
    return { mobile: primary, extraMobiles: extras };
  }
  return {
    mobile: text.replace(/\D/g, "").slice(-10) || text,
    extraMobiles: fromCol,
  };
}

export function mapCard(row: CardRow): CardDto {
  const { mobile, extraMobiles } = resolveCardMobiles(
    row.mobile,
    row.extra_mobiles,
  );
  return {
    cardId: Number(row.card_id),
    unicCardName: row.unic_card_name,
    cardName: row.card_name,
    jobName: row.job_name,
    businessName: row.business_name,
    userId: Number(row.user_id),
    logo: row.logo ?? null,
    bgImg: row.bg_img ?? null,
    bgUrl: row.bg_url ?? null,
    themeId: Number(row.theme_id),
    accentColor: row.accent_color?.trim() || null,
    mobile,
    extraMobiles,
    email: row.email ?? null,
    website: row.website ?? null,
    code: row.code || "91",
    whatsapp: row.whatsapp ?? null,
    stateId: row.state_id == null ? null : Number(row.state_id),
    cityId: row.city_id == null ? null : Number(row.city_id),
    address: row.address ?? null,
    about: row.about ?? null,
    facebookUrl: row.facebook_url ?? null,
    instagramUrl: row.instagram_url ?? null,
    linkedinUrl: row.linkedin_url ?? null,
    twitterUrl: row.twitter_url ?? null,
    youtubeUrl: row.youtube_url ?? null,
    googleUrl: row.google_url ?? null,
    aboutCompany: row.about_company ?? null,
    services: row.services ?? null,
    brochure: row.brochure ?? null,
    pageView: Number(row.page_view) || 0,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    dateTime: row.date_time,
    updateTime: row.update_time,
    status: Number(row.status) === 1,
  };
}

/** Oldest shape: no accent_color, no extra_mobiles */
export const CARD_COLS_LEGACY =
  "card_id, unic_card_name, card_name, job_name, business_name, user_id, logo, bg_img, bg_url, theme_id, mobile, email, website, code, whatsapp, state_id, city_id, address, about, facebook_url, instagram_url, linkedin_url, twitter_url, youtube_url, google_url, about_company, services, brochure, page_view, start_date, end_date, date_time, update_time, status" as const;

/** Has accent_color, no extra_mobiles */
export const CARD_COLS_NO_EXTRA =
  "card_id, unic_card_name, card_name, job_name, business_name, user_id, logo, bg_img, bg_url, theme_id, accent_color, mobile, email, website, code, whatsapp, state_id, city_id, address, about, facebook_url, instagram_url, linkedin_url, twitter_url, youtube_url, google_url, about_company, services, brochure, page_view, start_date, end_date, date_time, update_time, status" as const;

/** Full production columns — extra_mobiles last */
export const CARD_COLS =
  "card_id, unic_card_name, card_name, job_name, business_name, user_id, logo, bg_img, bg_url, theme_id, accent_color, mobile, email, website, code, whatsapp, state_id, city_id, address, about, facebook_url, instagram_url, linkedin_url, twitter_url, youtube_url, google_url, about_company, services, brochure, page_view, start_date, end_date, date_time, update_time, status, extra_mobiles" as const;

export function isAccentColumnMissingError(message: string | undefined | null) {
  return Boolean(message && /accent_color/i.test(message));
}

export function isExtraMobilesColumnMissingError(
  message: string | undefined | null,
) {
  return Boolean(message && /extra_mobiles/i.test(message));
}

export function stripAccentFromPayload<T extends Record<string, unknown>>(
  payload: T,
): T {
  if (!("accent_color" in payload)) return payload;
  const next = { ...payload };
  delete next.accent_color;
  return next;
}

export function stripExtraMobilesFromPayload<T extends Record<string, unknown>>(
  payload: T,
): T {
  if (!("extra_mobiles" in payload)) return payload;
  const next = { ...payload };
  delete next.extra_mobiles;
  return next;
}

export function slugifyCardName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}
