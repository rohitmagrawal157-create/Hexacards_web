import { Navbar, Footer, FranchiseEnquiry } from "@/components/landing";

export const metadata = {
  title: "Franchise — HexaCards",
  description:
    "Become a HexaCards franchise partner. Low investment, training, and pan-India opportunity in NFC digital business cards.",
};

export default function FranchisePage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        {/* <div className="border-b border-black/[0.06] bg-white/80">
          <div className="mx-auto max-w-6xl px-5 py-8 text-center sm:px-8 sm:py-10">
            <p className="text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
              Franchise
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141414] sm:text-4xl">
              Grow with HexaCards
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#5c5346] sm:text-base">
              Low investment. High returns. Join India&apos;s fastest-growing
              digital networking brand.
            </p>
          </div>
        </div> */}
        <FranchiseEnquiry />
      </main>
      <Footer />
    </div>
  );
}
