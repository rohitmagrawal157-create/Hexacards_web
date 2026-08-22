import ProductPageLayout from "./ProductPageLayout";

const STANDEE_BACK = {
  backHref: "/product/google-review-standee",
  backLabel: "Standees",
} as const;

export default function YoutubeStandee() {
  return <ProductPageLayout productId="youtube-standee" {...STANDEE_BACK} />;
}
