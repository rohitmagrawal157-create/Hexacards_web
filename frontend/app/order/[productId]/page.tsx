import { Navbar, Footer } from "@/components/landing";
import { DetailsForm, getProduct } from "@/components/products";
import DigitalQrOrderForm from "@/components/products/DigitalQrOrderForm";

type PageProps = {
  params: Promise<{ productId: string }> | { productId: string };
};

export async function generateMetadata({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const product = getProduct(resolved.productId);
  const isDigitalQr = resolved.productId === "digital-profile-qr";
  return {
    title: `${product.ctaLabel} — HexaCards`,
    description: isDigitalQr
      ? `Enter your contact details to order ${product.shortTitle}.`
      : `Share your link and logo to order ${product.shortTitle}.`,
  };
}

export default async function OrderDetailsPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const isDigitalQr = resolved.productId === "digital-profile-qr";

  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        {isDigitalQr ? (
          <DigitalQrOrderForm />
        ) : (
          <DetailsForm productId={resolved.productId} />
        )}
      </main>
      <Footer />
    </div>
  );
}
