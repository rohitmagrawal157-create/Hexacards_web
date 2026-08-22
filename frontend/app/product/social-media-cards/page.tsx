import { Navbar, Footer } from "@/components/landing";
import { SocialMediaCards } from "@/components/products";

export const metadata = {
  title: "Social Media Cards — HexaCards",
  description:
    "Instagram, YouTube, and Google Review NFC cards — choose a platform and open product details.",
};

export default function SocialMediaCardsPage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <SocialMediaCards />
      </main>
      <Footer />
    </div>
  );
}
