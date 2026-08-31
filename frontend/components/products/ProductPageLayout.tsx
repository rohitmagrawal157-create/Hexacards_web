import { HowItWorks, FAQ, Clients, Products, Feature } from "@/components/landing";
import { getPublicProductServer } from "@/lib/server/get-public-product";
import ProductDetails from "./ProductDetails";

type ProductPageLayoutProps = {
  productId: string;
  backHref?: string;
  backLabel?: string;
};

/** Shared layout: loads DB product on the server, then renders detail + landing sections. */
export default async function ProductPageLayout({
  productId,
  backHref = "/",
  backLabel = "Back",
}: ProductPageLayoutProps) {
  const product = await getPublicProductServer(productId);

  return (
    <>
      <ProductDetails
        productId={productId}
        product={product}
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
