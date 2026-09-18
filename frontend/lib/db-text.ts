/** True for SQL nulls stored as the literal text "NULL" / "undefined" / etc. */
export function isBlankDbValue(value: unknown): boolean {
  if (value == null) return true;
  const s = String(value).trim();
  if (!s) return true;
  const lower = s.toLowerCase();
  return (
    lower === "null" ||
    lower === "undefined" ||
    lower === "none" ||
    lower === "n/a" ||
    lower === "-" ||
    lower === "nil"
  );
}

/** Decode common HTML entities (&amp; → &). Runs a few passes for double-encoding. */
export function decodeHtmlEntities(input: string): string {
  let s = input;
  for (let i = 0; i < 4; i++) {
    const next = s
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      )
      .replace(/&#(\d+);/g, (_, n: string) =>
        String.fromCharCode(Number(n)),
      );
    if (next === s) break;
    s = next;
  }
  return s;
}

/** Clean a DB string for UI — blank/"NULL" → fallback; decode &amp; etc. */
export function cleanDbText(
  value: unknown,
  fallback = "",
): string {
  if (isBlankDbValue(value)) return fallback;
  const cleaned = decodeHtmlEntities(String(value).trim());
  if (isBlankDbValue(cleaned)) return fallback;
  return cleaned;
}

/** Prefer first non-blank cleaned candidate, else fallback. */
export function pickDbText(
  fallback: string,
  ...candidates: unknown[]
): string {
  for (const c of candidates) {
    const v = cleanDbText(c);
    if (v) return v;
  }
  return fallback || "";
}
