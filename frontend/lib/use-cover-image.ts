import { useEffect, useMemo, useState } from "react";
import {
  cardImageFileName,
  legacyCardImageCandidateUrls,
  resolveCardImageSrc,
  withCardImageCacheBust,
} from "@/lib/card-images";
import {
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
  resolveCoverImageForDisplay,
} from "@/lib/card-profile";

function tryLoad(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/** Resolve any stored image (filename, path, or URL) and fall back if it fails to load. */
export function useCardDisplayImage(
  src: string | null | undefined,
  fallback: string,
  version?: string | number | null,
): string {
  const resolved = useMemo(
    () =>
      withCardImageCacheBust(
        resolveCardImageSrc(src, fallback, version),
        version,
      ),
    [src, fallback, version],
  );
  const [url, setUrl] = useState(resolved);

  useEffect(() => {
    setUrl(resolved);
    if (!resolved || resolved === fallback || resolved.startsWith("data:")) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (await tryLoad(resolved)) {
        if (!cancelled) setUrl(resolved);
        return;
      }
      if (cancelled) return;

      const name =
        cardImageFileName(src) ||
        cardImageFileName(resolved) ||
        "";

      // 1) Supabase → local uploads (dev)
      if (resolved.includes("/storage/v1/object/public/") && name) {
        const qs = resolved.includes("?")
          ? `?${resolved.split("?").slice(1).join("?")}`
          : "";
        const local = `/uploads/cards/${encodeURIComponent(decodeURIComponent(name))}${qs}`;
        if (await tryLoad(local)) {
          if (!cancelled) setUrl(local);
          return;
        }
      }

      // 2) Legacy PHP host (hexacards.com/Images/…) for imported filenames
      for (const candidate of legacyCardImageCandidateUrls(name || resolved)) {
        const busted = withCardImageCacheBust(candidate, version);
        if (await tryLoad(busted)) {
          if (!cancelled) setUrl(busted);
          return;
        }
      }

      if (!cancelled) setUrl(fallback);
    })();

    return () => {
      cancelled = true;
    };
  }, [resolved, fallback, src, version]);

  return url;
}

/** Resolve cover URL and fall back to default banner if the image fails to load. */
export function useCoverImageUrl(
  cover?: string | null,
  shareImage?: string | null,
  version?: string | number | null,
): string {
  const resolved = useMemo(
    () => resolveCoverImageForDisplay(cover, shareImage, version),
    [cover, shareImage, version],
  );
  return useCardDisplayImage(resolved, DEFAULT_CARD_BANNER, version);
}

export function useLogoImageUrl(
  logo?: string | null,
  version?: string | number | null,
): string {
  return useCardDisplayImage(logo, DEFAULT_CARD_AVATAR, version);
}
