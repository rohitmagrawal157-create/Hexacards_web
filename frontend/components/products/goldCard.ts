/** Gold metallic gradient (foil finish) */
export const GOLD_GRADIENT =
  "linear-gradient(90deg,#9B6F18 0%,#C9982C 15%,#F7DFA7 30%,#FFF3D7 10%,#D8A83A 55%,#B8841D 72%,#D4A133 100%)";

/** Mid-tone for swatches / fallbacks that need a solid color */
export const GOLD_SOLID = "#C9982C";

/** SVG stop list for icon strokes */
export const GOLD_STOPS = [
  { offset: "0%", color: "#9B6F18" },
  { offset: "15%", color: "#C9982C" },
  { offset: "30%", color: "#F7DFA7" },
  { offset: "40%", color: "#FFF3D7" },
  { offset: "55%", color: "#D8A83A" },
  { offset: "72%", color: "#B8841D" },
  { offset: "100%", color: "#D4A133" },
] as const;

/** Gold card preset — metal accents; body can be black or white */
export const GOLD_CARD = {
  id: "gold",
  label: "Gold",
  description: "Black or white body · gold foil name, wifi & QR accents",
  bodyColors: ["#141414", "#FFFFFF"] as const,
  gradient: GOLD_GRADIENT,
  contentColor: GOLD_SOLID,
  accentColor: GOLD_SOLID,
  stops: GOLD_STOPS,
} as const;

export type GoldCardFields = typeof GOLD_CARD;
