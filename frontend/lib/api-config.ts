/**
 * API base for HexaCards.
 * Default: same-origin Next.js App Router routes (`/api/...`).
 * Optional override: NEXT_PUBLIC_API_URL (e.g. separate service).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "";
}

export type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  details?: string;
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalized}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
    if (!res.ok || !json?.ok) {
      return {
        ok: false,
        error: json?.error || `Request failed (${res.status})`,
        details: json?.details,
      };
    }
    return json;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
