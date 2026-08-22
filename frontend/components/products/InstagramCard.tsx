import ProductPageLayout from "./ProductPageLayout";

const SOCIAL_BACK = {
  backHref: "/product/social-media-cards",
  backLabel: "Social Cards",
} as const;

export default function InstagramCard() {
  return <ProductPageLayout productId="instagram-card" {...SOCIAL_BACK} />;
}
