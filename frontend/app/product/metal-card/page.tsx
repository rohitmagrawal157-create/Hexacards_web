import { Navbar, Footer } from "@/components/landing";
import { MetalCard, getProduct } from "@/components/products";

const product = getProduct("metal-card");

export const metadata = {
  title: `${product.shortTitle} — HexaCards`,
  description: product.description,
};

export default function MetalCardPage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <MetalCard />
      </main>
      <Footer />
    </div>
  );
}
