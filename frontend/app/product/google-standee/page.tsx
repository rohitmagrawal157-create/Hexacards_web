import { Navbar, Footer } from "@/components/landing";
import { GoogleStandee, getProduct } from "@/components/products";

const product = getProduct("google-standee");

export const metadata = {
  title: `${product.shortTitle} — HexaCards`,
  description: product.description,
};

export default function GoogleStandeePage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <GoogleStandee />
      </main>
      <Footer />
    </div>
  );
}
