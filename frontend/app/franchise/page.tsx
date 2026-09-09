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
        <FranchiseEnquiry />
      </main>
      <Footer />
    </div>
  );
}
