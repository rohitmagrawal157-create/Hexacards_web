import type { Metadata, Viewport } from "next";
import { getCardOpenGraphMetadata } from "@/lib/server/card-og";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ cardSlug: string }>;
};

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { cardSlug } = await params;
  return getCardOpenGraphMetadata(cardSlug);
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const dynamic = "force-dynamic";

export default function PublicCardLayout({ children }: LayoutProps) {
  return children;
}
