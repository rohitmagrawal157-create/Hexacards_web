import { Navbar, Footer } from "@/components/landing";
import Checkout from "@/components/products/Checkout";

export const metadata = {
  title: "Checkout — HexaCards",
  description: "Complete your Hexa NFC business card order.",
};

export default function CheckoutPage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <Checkout />
      </main>
      <Footer />
    </div>
  );
}
