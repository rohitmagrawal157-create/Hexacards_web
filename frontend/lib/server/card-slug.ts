import type { getSupabaseAdmin } from "@/lib/supabase/server";
import { sanitizeCardUsername } from "@/lib/server/card-image-storage";
import { slugifyCardName } from "@/lib/server/card-types";

export function baseCardSlugFromName(name: string): string {
  const base = slugifyCardName(name) || "hexa-card";
  return sanitizeCardUsername(base);
}

/** Next free slug: base, base2, base3, … (no hyphen before the number). */
export function allocateUniqueCardSlug(
  name: string,
  taken: Set<string>,
  excludeSlug?: string,
): string {
  const base = baseCardSlugFromName(name);
  const normalizedExclude = excludeSlug?.trim().toLowerCase();
  const reserved = new Set(taken);
  if (normalizedExclude) reserved.delete(normalizedExclude);

  if (!reserved.has(base)) return base;

  let n = 2;
  while (reserved.has(`${base}${n}`)) {
    n += 1;
    if (n > 9999) throw new Error("Could not allocate unique card slug");
  }
  return `${base}${n}`;
}

export async function fetchTakenCardSlugs(
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<Set<string>> {
  const taken = new Set<string>();

  const { data: cards } = await supabase.from("cards").select("unic_card_name");
  for (const row of cards ?? []) {
    const slug = String(row.unic_card_name ?? "").trim().toLowerCase();
    if (slug) taken.add(slug);
  }

  const { data: orders } = await supabase.from("orders").select("card_slug");
  for (const row of orders ?? []) {
    const slug = String(row.card_slug ?? "").trim().toLowerCase();
    if (slug) taken.add(slug);
  }

  return taken;
}

export async function allocateCardSlugForName(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  name: string,
  excludeSlug?: string,
): Promise<string> {
  const taken = await fetchTakenCardSlugs(supabase);
  return allocateUniqueCardSlug(name, taken, excludeSlug);
}
