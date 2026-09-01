import { Suspense } from "react";
import { Navbar, Footer } from "@/components/landing";
import OrderThankYouPage from "@/components/products/OrderThankYouPage";

export const metadata = {
  title: "Thank you — HexaCards",
  description: "Your HexaCards order is confirmed.",
};

export default function ThankYouPage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-[#5c5346]">
              Loading your order…
            </div>
          }
        >
          <OrderThankYouPage />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
