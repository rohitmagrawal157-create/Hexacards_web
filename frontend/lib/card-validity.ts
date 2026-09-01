/** Digital profile validity for PVC, NFC business, and Digital + QR products. */
export const CARD_VALIDITY_YEARS = 25;

export const CARD_VALIDITY_PRODUCT_IDS = new Set([
  "pvc-card",
  "nfc-business-card",
  "digital-profile-qr",
]);

export const CARD_VALIDITY_LABEL = `${CARD_VALIDITY_YEARS}-year digital profile`;

export function hasCardValidityLimit(productId?: string | null): boolean {
  const id = String(productId ?? "").trim().toLowerCase();
  return id ? CARD_VALIDITY_PRODUCT_IDS.has(id) : false;
}

export function toIsoDateOnly(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function addYearsIso(iso: string, years: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    now.setFullYear(now.getFullYear() + years);
    return now.toISOString().slice(0, 10);
  }
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

/** ISO date (YYYY-MM-DD) for cards.end_date, or null when product has no limit. */
export function computeCardEndDateIso(
  startIso: string,
  productId?: string | null,
): string | null {
  if (!hasCardValidityLimit(productId)) return null;
  return addYearsIso(startIso, CARD_VALIDITY_YEARS);
}

export function isCardPastEndDate(
  endDate?: string | null,
  now = new Date(),
): boolean {
  if (!endDate?.trim()) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return today.getTime() > end.getTime();
}
