export { default as BasicLayout } from "./BasicLayout";
export type { BasicHeaderProps } from "./BasicLayout";
export { default as Basic } from "./Basic";
export { default as Modern } from "./modern";
export { default as Compact } from "./compact";
export { default as Social } from "./social";
export { default as Minimalist } from "./Minimalist";
export { default as CardLayoutBottom } from "./CardLayoutBottom";
export { default as CardLayoutFooter } from "./CardLayoutFooter";
export { default as CardShareModal } from "./CardShareModal";
export { default as PhoneFrame } from "./PhoneFrame";
export { default as LayoutPhonePreview } from "./LayoutPhonePreview";

/** Card layouts — Classic, Basic, Modern, Compact, Social & Minimalist are live */
export const CARD_LAYOUTS = [
  {
    id: "classic",
    label: "Classic",
    description: "Centered avatar under the banner",
    available: true,
  },
  {
    id: "basic",
    label: "Basic",
    description: "Centered avatar with quick-action icons",
    available: true,
  },
  {
    id: "modern",
    label: "Modern",
    description: "Stacked contact rows with quick icons",
    available: true,
  },
  {
    id: "compact",
    label: "Compact",
    description: "Tabbed contact, socials & message form",
    available: true,
  },
  {
    id: "social",
    label: "Social",
    description: "Dark brand card with social icon grid",
    available: true,
  },
  {
    id: "minimalist",
    label: "Minimalist",
    description: "Clean banner with circular quick actions",
    available: true,
  },
] as const;

export type CardLayoutId = (typeof CARD_LAYOUTS)[number]["id"];

export function isCardLayoutId(
  value: string | null | undefined,
): value is CardLayoutId {
  return CARD_LAYOUTS.some((l) => l.id === value);
}

export function isAvailableLayoutId(
  value: string | null | undefined,
): value is CardLayoutId {
  return CARD_LAYOUTS.some((l) => l.available && l.id === value);
}

export function normalizeCardLayout(
  value: string | null | undefined,
): CardLayoutId {
  if (isAvailableLayoutId(value)) return value;
  return "classic";
}
