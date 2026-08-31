import type { HexaCardProfile } from "@/lib/card-profile";
import type { LinkType } from "@/lib/server/link-types";

/** Map card profile → all link types for DB upsert (empty = disable link). */
export function profileToLinkValues(
  profile: HexaCardProfile,
): Partial<Record<LinkType, string>> {
  const trim = (v: string | null | undefined) => String(v ?? "").trim();
  return {
    website: trim(profile.contact.website),
    facebook: trim(profile.social.facebook),
    instagram: trim(profile.social.instagram),
    linkedin: trim(profile.social.linkedin),
    twitter: trim(profile.social.twitter),
    youtube: trim(profile.social.youtube),
    google_review: trim(profile.social.googleReview),
    telegram: trim(profile.social.telegram),
    snapchat: trim(profile.social.snapchat),
    pinterest: trim(profile.social.pinterest),
    tripadvisor: trim(profile.social.tripadvisor),
    brochure: profile.contact.brochureName
      ? trim(profile.contact.brochureName).slice(0, 500)
      : "",
  };
}
