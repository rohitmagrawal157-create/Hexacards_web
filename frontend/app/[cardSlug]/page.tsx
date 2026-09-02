import { Suspense } from "react";
import type { Viewport } from "next";
import PublicCard from "@/components/user-dashboard/PublicCard";

export const metadata = {
  title: "Digital Card — HexaCards",
  description: "View this HexaCards digital business card profile.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function PublicCardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
          <p className="text-sm font-medium text-[#5c5346]">Loading card…</p>
        </div>
      }
    >
      <PublicCard />
    </Suspense>
  );
}
