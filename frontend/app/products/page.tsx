import { Navbar, Footer } from "@/components/landing";
import { NavProduct } from "@/components/products";

export const metadata = {
  title: "Products — HexaCards",
  description:
    "Browse Instagram, YouTube, Google Review cards, NFC business cards, stands, and keychains — open any product for full details.",
};

export default function ProductsPage() {  
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <NavProduct />
      </main>
      <Footer />
    </div>
  );
}
