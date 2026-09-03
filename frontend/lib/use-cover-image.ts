import { useEffect, useMemo, useState } from "react";
import { resolveCardImageSrc } from "@/lib/card-images";
import {
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
  resolveCoverImageForDisplay,
} from "@/lib/card-profile";

/** Resolve any stored image (filename, path, or URL) and fall back if it fails to load. */
export function useCardDisplayImage(
  src: string | null | undefined,
  fallback: string,
): string {
  const resolved = useMemo(
    () => resolveCardImageSrc(src, fallback),
    [src, fallback],
  );
  const [url, setUrl] = useState(resolved);

  useEffect(() => {
    setUrl(resolved);
    if (!resolved || resolved === fallback || resolved.startsWith("data:")) {
      return;
    }

    const img = new window.Image();
    img.onload = () => setUrl(resolved);
    img.onerror = () => {
      if (resolved.includes("/storage/v1/object/public/")) {
        const name = resolved.split("/").pop()?.split("?")[0];
        if (name) {
          const local = `/uploads/cards/${decodeURIComponent(name)}`;
          const retry = new window.Image();
          retry.onload = () => setUrl(local);
          retry.onerror = () => setUrl(fallback);
          retry.src = local;
          return;
        }
      }
      setUrl(fallback);
    };
    img.src = resolved;
  }, [resolved, fallback]);

  return url;
}

/** Resolve cover URL and fall back to default banner if the image fails to load. */
export function useCoverImageUrl(
  cover?: string | null,
  shareImage?: string | null,
): string {
  const resolved = useMemo(
    () => resolveCoverImageForDisplay(cover, shareImage),
    [cover, shareImage],
  );
  return useCardDisplayImage(resolved, DEFAULT_CARD_BANNER);
}

export function useLogoImageUrl(logo?: string | null): string {
  return useCardDisplayImage(logo, DEFAULT_CARD_AVATAR);
}
