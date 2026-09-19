/**
 * Pure slug uniqueness helpers (safe for client + server).
 * Public links: base, base2, base3, … (no hyphen before the number).
 */

export function slugifyForCardLink(value: string): string {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "hexa-card"
  );
}

export function stripSlugNumericSuffix(slug: string): string {
  const clean = slugifyForCardLink(slug);
  const stripped = clean.replace(/\d+$/, "");
  return slugifyForCardLink(stripped) || "hexa-card";
}

/** preferred → if taken then base2, base3, … */
export function nextAvailableSlug(
  preferred: string,
  taken: Set<string>,
  excludeSlug?: string,
): string {
  const clean = slugifyForCardLink(preferred);
  const reserved = new Set(
    [...taken].map((s) => slugifyForCardLink(s)).filter(Boolean),
  );
  const normalizedExclude = excludeSlug
    ? slugifyForCardLink(excludeSlug)
    : "";
  if (normalizedExclude) reserved.delete(normalizedExclude);

  if (!reserved.has(clean)) return clean;

  const base = stripSlugNumericSuffix(clean);
  let n = 2;
  while (reserved.has(`${base}${n}`)) {
    n += 1;
    if (n > 9999) throw new Error("Could not allocate unique card slug");
  }
  return `${base}${n}`;
}

export function allocateUniqueSlugFromName(
  name: string,
  taken: Set<string>,
  excludeSlug?: string,
): string {
  return nextAvailableSlug(slugifyForCardLink(name), taken, excludeSlug);
}
