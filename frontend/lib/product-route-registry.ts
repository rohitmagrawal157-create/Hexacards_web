import type { ComponentType } from "react";
import {
  DigitalProfileQr,
  GoogleReviewCard,
  GoogleReviewStandee,
  GoogleStandee,
  InstagramCard,
  InstagramStandee,
  MetalCard,
  NfcBusinessCard,
  PvcCard,
  ReviewKeychainQr,
  SocialMediaCards,
  WoodenCard,
  YoutubeCard,
  YoutubeStandee,
} from "@/components/products";

/** Legacy / typo URLs → canonical product slug. */
export const PRODUCT_ROUTE_REDIRECTS: Record<string, string> = {
  "google-review-standy": "/product/google-review-standee",
  "google-standy": "/product/google-standee",
  "instagram-standy": "/product/instagram-standee",
  "youtube-standy": "/product/youtube-standee",
};

export const PRODUCT_PAGE_SLUGS = [
  "nfc-business-card",
  "pvc-card",
  "metal-card",
  "wooden-card",
  "digital-profile-qr",
  "social-media-cards",
  "google-review-card",
  "instagram-card",
  "youtube-card",
  "google-review-standee",
  "google-standee",
  "instagram-standee",
  "youtube-standee",
  "review-keychain-qr",
] as const;

export type ProductPageSlug = (typeof PRODUCT_PAGE_SLUGS)[number];

const PRODUCT_COMPONENTS: Record<ProductPageSlug, ComponentType> = {
  "nfc-business-card": NfcBusinessCard,
  "pvc-card": PvcCard,
  "metal-card": MetalCard,
  "wooden-card": WoodenCard,
  "digital-profile-qr": DigitalProfileQr,
  "social-media-cards": SocialMediaCards,
  "google-review-card": GoogleReviewCard,
  "instagram-card": InstagramCard,
  "youtube-card": YoutubeCard,
  "google-review-standee": GoogleReviewStandee,
  "google-standee": GoogleStandee,
  "instagram-standee": InstagramStandee,
  "youtube-standee": YoutubeStandee,
  "review-keychain-qr": ReviewKeychainQr,
};

const PRODUCT_METADATA_OVERRIDES: Partial<
  Record<ProductPageSlug, { title: string; description: string }>
> = {
  "social-media-cards": {
    title: "Social Media Cards — HexaCards",
    description:
      "Instagram, YouTube, and Google Review NFC cards — choose a platform and open product details.",
  },
  "google-review-standee": {
    title: "Review Standee — HexaCards",
    description:
      "Google, Instagram, and YouTube countertop standees — choose a platform and open product details.",
  },
};

export function isProductPageSlug(slug: string): slug is ProductPageSlug {
  return (PRODUCT_PAGE_SLUGS as readonly string[]).includes(slug);
}

export function getProductPageComponent(
  slug: ProductPageSlug,
): ComponentType {
  return PRODUCT_COMPONENTS[slug];
}

export function getProductPageMetadataOverride(slug: ProductPageSlug) {
  return PRODUCT_METADATA_OVERRIDES[slug];
}
