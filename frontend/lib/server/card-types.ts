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
  mobile: string;
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
  mobile?: string;
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

export function mapCard(row: CardRow): CardDto {
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
    mobile: row.mobile,
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

export const CARD_COLS =
  "card_id, unic_card_name, card_name, job_name, business_name, user_id, logo, bg_img, bg_url, theme_id, mobile, email, website, code, whatsapp, state_id, city_id, address, about, facebook_url, instagram_url, linkedin_url, twitter_url, youtube_url, google_url, about_company, services, brochure, page_view, start_date, end_date, date_time, update_time, status" as const;

export function slugifyCardName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}
