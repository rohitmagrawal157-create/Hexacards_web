/**
 * PostgREST: "Could not find the 'foo' column of 'orders' in the schema cache"
 * Extract the missing column name so we can strip and retry.
 */
export function missingColumnFromPostgrestError(
  message: string | null | undefined,
): string | null {
  const raw = String(message ?? "");
  const m =
    raw.match(/Could not find the '([^']+)' column/i) ||
    raw.match(/column ["']?([a-zA-Z0-9_]+)["']? of relation/i);
  return m?.[1] ?? null;
}

/**
 * Insert into a table; if PostgREST rejects unknown columns (schema drift),
 * strip them and retry a few times.
 */
export async function insertStrippingUnknownColumns<T extends Record<string, unknown>>(
  insertOnce: (
    payload: Record<string, unknown>,
  ) => Promise<{ data: T | null; error: { message: string } | null }>,
  payload: Record<string, unknown>,
  maxStrips = 8,
): Promise<{ data: T | null; error: { message: string } | null; stripped: string[] }> {
  let next = { ...payload };
  const stripped: string[] = [];

  for (let i = 0; i <= maxStrips; i += 1) {
    const result = await insertOnce(next);
    if (!result.error) {
      return { data: result.data, error: null, stripped };
    }
    const col = missingColumnFromPostgrestError(result.error.message);
    if (!col || !(col in next)) {
      return { data: null, error: result.error, stripped };
    }
    delete next[col];
    stripped.push(col);
  }

  return {
    data: null,
    error: { message: `Too many unknown columns stripped: ${stripped.join(", ")}` },
    stripped,
  };
}
