import {
  Navbar,
  Footer,
  Testimonials,
  Products,
  FAQ,
} from "@/components/landing";

export const metadata = {
  title: "Reviews — HexaCards",
  description:
    "Collect more Google reviews with Hexa review cards and review stands.",
};

export default function ReviewsPage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <div className="border-b border-black/[0.06] bg-white/80">
          <div className="mx-auto max-w-6xl px-5 py-8 text-center sm:px-8 sm:py-10">
            <p className="text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
              For Reviews
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141414] sm:text-4xl">
              Grow with customer reviews
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#5c5346] sm:text-base">
              Social media cards and counter stands that make collecting
              feedback effortless.
            </p>
          </div>
        </div>
        <Testimonials />
        <Products />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
