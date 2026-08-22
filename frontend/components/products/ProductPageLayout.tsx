import { HowItWorks, FAQ, Clients, Products, Feature } from "@/components/landing";
import ProductDetails from "./ProductDetails";

type ProductPageLayoutProps = {
  productId: string;
  backHref?: string;
  backLabel?: string;
};

/** Shared layout: product-specific details on top, same sections below every page */
export default function ProductPageLayout({
  productId,
  backHref = "/",
  backLabel = "Back",
}: ProductPageLayoutProps) {
  return (
    <>
      <ProductDetails
        productId={productId}
        backHref={backHref}
        backLabel={backLabel}
      />
      <Clients />
      <Products />
      <HowItWorks />
      <Feature />
      <FAQ />
    </>
  );
}
