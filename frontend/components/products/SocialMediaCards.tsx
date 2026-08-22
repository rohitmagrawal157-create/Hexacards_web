import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HowItWorks, FAQ } from "@/components/landing";
import ProductsCatalog, { SOCIAL_MEDIA_CATALOG } from "./ProductsCatalog";

/**
 * Social Media Cards category hub:
 * Landing → grid (Google → Instagram → YouTube) → product detail
 */
export default function SocialMediaCards() {
  return (
    <>
      <div className="border-b border-black/[0.06] bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:py-10">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
              Category
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141414] sm:text-4xl">
              Social Media Cards
            </h1>
            <p className="mt-2 text-sm text-[#5c5346] sm:text-base">
              Choose Google Reviews, Instagram, or YouTube — then open the
              product details to order.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-[#BC7C10] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Products
          </Link>
        </div>
      </div>

      <ProductsCatalog
        entries={SOCIAL_MEDIA_CATALOG}
        eyebrow="Social media"
        title="Pick your platform"
        description="1. Google Reviews · 2. Instagram · 3. YouTube — each card opens your page in one tap or scan."
        compact
      />
      <HowItWorks />
      <FAQ />
    </>
  );
}
