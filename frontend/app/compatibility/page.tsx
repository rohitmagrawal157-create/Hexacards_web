import { Navbar, Footer, Compatibility } from "@/components/landing";

export const metadata = {
  title: "Device Compatibility — HexaCards",
  description:
    "Check which iPhone and Android devices support Hexa Cards NFC tap. QR code works on every phone.",
};

export default function CompatibilityPage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <Compatibility />
      </main>
      <Footer />
    </div>
  );
}
