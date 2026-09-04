import { useEffect, useMemo, useState } from "react";
import {
  resolveCardImageSrc,
  withCardImageCacheBust,
} from "@/lib/card-images";
import {
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
  resolveCoverImageForDisplay,
} from "@/lib/card-profile";

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
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setUrl(resolved);
    };
    img.onerror = () => {
      if (cancelled) return;
      if (resolved.includes("/storage/v1/object/public/")) {
        const name = resolved.split("/").pop()?.split("?")[0];
        if (name) {
          const qs = resolved.includes("?")
            ? `?${resolved.split("?").slice(1).join("?")}`
            : "";
          const local = `/uploads/cards/${decodeURIComponent(name)}${qs}`;
          const retry = new window.Image();
          retry.onload = () => {
            if (!cancelled) setUrl(local);
          };
          retry.onerror = () => {
            if (!cancelled) setUrl(fallback);
          };
          retry.src = local;
          return;
        }
      }
      setUrl(fallback);
    };
    img.src = resolved;
    return () => {
      cancelled = true;
    };
  }, [resolved, fallback]);

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
