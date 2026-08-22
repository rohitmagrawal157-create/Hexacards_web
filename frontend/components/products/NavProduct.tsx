import { HowItWorks, FAQ } from "@/components/landing";
import ProductsCatalog from "./ProductsCatalog";

/** Navbar → Products page: full catalog grid → each card opens detail page */
export default function NavProduct() {
  return (
    <>
      <div className="border-b border-black/[0.06] bg-white/80">
        <div className="mx-auto max-w-6xl px-5 py-8 text-center sm:px-8 sm:py-10">
          <p className="text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            Catalog
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141414] sm:text-4xl">
            Our Products
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#5c5346] sm:text-base">
            Instagram, YouTube, Google Reviews, NFC cards, stands, and keychains
            — click any product to open its detail page.
          </p>
        </div>
      </div>
      <ProductsCatalog />
      <HowItWorks />
      <FAQ />
    </>
  );
}
