import { Navbar, Footer } from "@/components/landing";
import { InstagramStandee, getProduct } from "@/components/products";

const product = getProduct("instagram-standee");

export const metadata = {
  title: `${product.shortTitle} — HexaCards`,
  description: product.description,
};

export default function InstagramStandeePage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <InstagramStandee />
      </main>
      <Footer />
    </div>
  );
}
