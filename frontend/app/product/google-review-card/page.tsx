import { Navbar, Footer } from "@/components/landing";
import { GoogleReviewCard, getProduct } from "@/components/products";

const product = getProduct("google-review-card");

export const metadata = {
  title: `${product.shortTitle} — HexaCards`,
  description: product.description,
};

export default function GoogleReviewCardPage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <GoogleReviewCard />
      </main>
      <Footer />
    </div>
  );
}
