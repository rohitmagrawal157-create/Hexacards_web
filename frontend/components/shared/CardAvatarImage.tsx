"use client";

import { useLogoImageUrl } from "@/lib/use-cover-image";

type CardAvatarImageProps = {
  src?: string | null;
  className?: string;
  alt?: string;
};

/** Profile photo — falls back to the default avatar if the stored file is missing. */
export default function CardAvatarImage({
  src,
  className = "",
  alt = "",
}: CardAvatarImageProps) {
  const url = useLogoImageUrl(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={`h-full w-full object-cover object-center ${className}`}
    />
  );
}
