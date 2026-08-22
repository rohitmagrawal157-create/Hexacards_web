import { GOLD_CARD } from "./goldCard";
import { SILVER_CARD } from "./silverCard";

export { GOLD_CARD } from "./goldCard";
export { SILVER_CARD } from "./silverCard";

/** Black card only — metal foil finishes */
export type MetalMode = "gold" | "silver";

/** White card uses customize accents; black card uses metal modes */
export type CardMode = MetalMode | "customize";

export const METAL_MODES: {
  id: MetalMode;
  label: string;
  hint: string;
}[] = [
  { id: "gold", label: "Gold", hint: GOLD_CARD.description },
  { id: "silver", label: "Silver", hint: SILVER_CARD.description },
];

/** @deprecated use METAL_MODES — kept for any legacy imports */
export const CARD_MODES = METAL_MODES;

export function getMetalPreset(mode: MetalMode) {
  return mode === "gold" ? GOLD_CARD : SILVER_CARD;
}
