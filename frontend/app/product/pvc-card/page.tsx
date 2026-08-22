import { Navbar, Footer } from "@/components/landing";
import { PvcCard, getProduct } from "@/components/products";

const product = getProduct("pvc-card");

export const metadata = {
  title: `${product.shortTitle} — HexaCards`,
  description: product.description,
};

export default function PvcCardPage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <PvcCard />
      </main>
      <Footer />
    </div>
  );
}
