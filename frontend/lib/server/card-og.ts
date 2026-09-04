import type { Metadata } from "next";
import {
  CARD_OG_DESCRIPTION,
  CARD_OG_FALLBACK_IMAGE,
  getCardOgPayload,
} from "@/lib/server/card-og-data";
import { getShareSiteOrigin } from "@/lib/site-url";

export async function getCardOpenGraphMetadata(
  rawSlug: string,
): Promise<Metadata> {
  const origin = getShareSiteOrigin();
  const fallbackImage = `${origin}${CARD_OG_FALLBACK_IMAGE}`;
  const payload = await getCardOgPayload(rawSlug);

  if (!payload) {
    return {
      title: "Digital Card — HexaCards",
      description: CARD_OG_DESCRIPTION,
      openGraph: {
        title: "HexaCards",
        description: CARD_OG_DESCRIPTION,
        url: origin,
        siteName: "HexaCards",
        type: "website",
        images: [
          {
            url: fallbackImage,
            width: 512,
            height: 512,
            alt: "HexaCards",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "HexaCards",
        description: CARD_OG_DESCRIPTION,
        images: [fallbackImage],
      },
    };
  }

  const { name, description, pageUrl, imageUrl } = payload;

  return {
    title: `${name} — HexaCards`,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: name,
      description,
      url: pageUrl,
      siteName: "HexaCards",
      type: "profile",
      locale: "en_IN",
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          width: 800,
          height: 800,
          alt: name,
          type: imageUrl.toLowerCase().includes(".png")
            ? "image/png"
            : imageUrl.toLowerCase().includes(".webp")
              ? "image/webp"
              : "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: [imageUrl],
    },
  };
}
