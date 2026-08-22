import ProductPageLayout from "./ProductPageLayout";

/** Legacy catalog id — same as Google Standee detail */
export default function ReviewStand() {
  return (
    <ProductPageLayout
      productId="google-standee"
      backHref="/product/google-review-standee"
      backLabel="Standees"
    />
  );
}
