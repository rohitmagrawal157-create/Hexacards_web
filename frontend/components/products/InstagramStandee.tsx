import ProductPageLayout from "./ProductPageLayout";

const STANDEE_BACK = {
  backHref: "/product/google-review-standee",
  backLabel: "Standees",
} as const;

export default function InstagramStandee() {
  return <ProductPageLayout productId="instagram-standee" {...STANDEE_BACK} />;
}
