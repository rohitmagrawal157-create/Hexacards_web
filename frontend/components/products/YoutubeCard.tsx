import ProductPageLayout from "./ProductPageLayout";

const SOCIAL_BACK = {
  backHref: "/product/social-media-cards",
  backLabel: "Social Cards",
} as const;

export default function YoutubeCard() {
  return <ProductPageLayout productId="youtube-card" {...SOCIAL_BACK} />;
}
