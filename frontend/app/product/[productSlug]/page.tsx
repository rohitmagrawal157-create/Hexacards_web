import { notFound, redirect } from "next/navigation";
import { Navbar, Footer } from "@/components/landing";
import { getProduct } from "@/lib/product-catalog";
import {
  getProductPageComponent,
  getProductPageMetadataOverride,
  isProductPageSlug,
  PRODUCT_PAGE_SLUGS,
  PRODUCT_ROUTE_REDIRECTS,
} from "@/lib/product-route-registry";

type Props = {
  params: Promise<{ productSlug: string }> | { productSlug: string };
};

export function generateStaticParams() {
  return [
    ...PRODUCT_PAGE_SLUGS.map((productSlug) => ({ productSlug })),
    ...Object.keys(PRODUCT_ROUTE_REDIRECTS).map((productSlug) => ({
      productSlug,
    })),
  ];
}

export async function generateMetadata({ params }: Props) {
  const { productSlug } = await Promise.resolve(params);
  const redirectTo = PRODUCT_ROUTE_REDIRECTS[productSlug];
  if (redirectTo) {
    return { title: "Redirecting — HexaCards" };
  }

  if (!isProductPageSlug(productSlug)) {
    return { title: "Product — HexaCards" };
  }

  const override = getProductPageMetadataOverride(productSlug);
  if (override) {
    return {
      title: override.title,
      description: override.description,
    };
  }

  const product = getProduct(productSlug);
  return {
    title: `${product.shortTitle} — HexaCards`,
    description: product.description,
  };
}

export default async function ProductSlugPage({ params }: Props) {
  const { productSlug } = await Promise.resolve(params);
  const redirectTo = PRODUCT_ROUTE_REDIRECTS[productSlug];
  if (redirectTo) {
    redirect(redirectTo);
  }

  if (!isProductPageSlug(productSlug)) {
    notFound();
  }

  const ProductContent = getProductPageComponent(productSlug);
  if (!getProduct(productSlug)) {
    notFound();
  }

  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <ProductContent />
      </main>
      <Footer />
    </div>
  );
}
