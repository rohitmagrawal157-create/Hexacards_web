import ProductPageLayout from "./ProductPageLayout";

const SOCIAL_BACK = {
  backHref: "/product/social-media-cards",
  backLabel: "Social Cards",
} as const;

export default function GoogleReviewCard() {
  return <ProductPageLayout productId="google-review-card" {...SOCIAL_BACK} />;
}
