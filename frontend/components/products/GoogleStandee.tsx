import ProductPageLayout from "./ProductPageLayout";

const STANDEE_BACK = {
  backHref: "/product/google-review-standee",
  backLabel: "Standees",
} as const;

export default function GoogleStandee() {
  return <ProductPageLayout productId="google-standee" {...STANDEE_BACK} />;
}
