"use client";

import { useCoverImageUrl } from "@/lib/use-cover-image";

type CardCoverImageProps = {
  src?: string | null;
  shareImage?: string | null;
  version?: string | number | null;
  className?: string;
  alt?: string;
};

/** Cover banner — always shows default stock image when none is set or load fails. */
export default function CardCoverImage({
  src,
  shareImage,
  version,
  className = "",
  alt = "",
}: CardCoverImageProps) {
  const coverUrl = useCoverImageUrl(src, shareImage, version);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={coverUrl}
      src={coverUrl}
      alt={alt}
      className={`absolute inset-0 h-full w-full object-cover object-center ${className}`}
    />
  );
}
