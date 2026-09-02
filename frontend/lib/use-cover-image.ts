import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CARD_BANNER,
  resolveCoverImageForDisplay,
} from "@/lib/card-profile";

/** Resolve cover URL and fall back to default banner if the image fails to load. */
export function useCoverImageUrl(
  cover?: string | null,
  shareImage?: string | null,
): string {
  const resolved = useMemo(
    () => resolveCoverImageForDisplay(cover, shareImage),
    [cover, shareImage],
  );
  const [url, setUrl] = useState(resolved);

  useEffect(() => {
    setUrl(resolved);
    if (!resolved || resolved === DEFAULT_CARD_BANNER) return;

    const img = new window.Image();
    img.onerror = () => setUrl(DEFAULT_CARD_BANNER);
    img.onload = () => setUrl(resolved);
    img.src = resolved;
  }, [resolved]);

  return url;
}
