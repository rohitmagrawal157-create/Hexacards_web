/** Silver metallic gradient (foil finish) */
export const SILVER_GRADIENT =
  "linear-gradient(90deg,#6E7276 0%,#9CA0A4 15%,#E6E8EA 30%,#FAFBFC 10%,#B4B8BC 55%,#787D82 72%,#A8ACB0 100%)";

/** Mid-tone for swatches / fallbacks that need a solid color */
export const SILVER_SOLID = "#9CA0A4";

/** SVG stop list for icon strokes */
export const SILVER_STOPS = [
  { offset: "0%", color: "#6E7276" },
  { offset: "15%", color: "#9CA0A4" },
  { offset: "30%", color: "#E6E8EA" },
  { offset: "40%", color: "#FAFBFC" },
  { offset: "55%", color: "#B4B8BC" },
  { offset: "72%", color: "#787D82" },
  { offset: "100%", color: "#A8ACB0" },
] as const;

/** Silver card preset — metal accents; body can be black or white */
export const SILVER_CARD = {
  id: "silver",
  label: "Silver",
  description: "Black or white body · silver foil name, wifi & QR accents",
  bodyColors: ["#141414", "#FFFFFF"] as const,
  gradient: SILVER_GRADIENT,
  contentColor: SILVER_SOLID,
  accentColor: SILVER_SOLID,
  stops: SILVER_STOPS,
} as const;

export type SilverCardFields = typeof SILVER_CARD;
