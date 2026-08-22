import { Navbar, Footer } from "@/components/landing";
import { GoogleReviewStandee } from "@/components/products";

export const metadata = {
  title: "Review Standee — HexaCards",
  description:
    "Google, Instagram, and YouTube countertop standees — choose a platform and open product details.",
};

export default function GoogleReviewStandeePage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <GoogleReviewStandee />
      </main>
      <Footer />
    </div>
  );
}
