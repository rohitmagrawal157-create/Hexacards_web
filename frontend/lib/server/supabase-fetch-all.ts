/**
 * Supabase/PostgREST defaults to max ~1000 rows per request.
 * Page with .range() until all rows are loaded.
 */
export async function fetchAllSupabaseRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
  maxRows = 100_000,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  let from = 0;

  while (from < maxRows) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      return { data: all, error };
    }
    const chunk = data ?? [];
    all.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return { data: all, error: null };
}
