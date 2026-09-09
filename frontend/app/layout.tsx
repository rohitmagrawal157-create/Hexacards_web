import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Syne } from "next/font/google";
import OfferBannerDialog from "@/components/landing/OfferBannerDialog";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    (() => {
      const share = process.env.NEXT_PUBLIC_SHARE_SITE_URL?.trim();
      if (share && !/localhost|127\.0\.0\.1/i.test(share)) return share;
      const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      if (site && !/localhost|127\.0\.0\.1/i.test(site)) return site;
      return "https://hexacards-web.vercel.app";
    })(),
  ),
  title: "HexaCards — Interactive Identity Cards",
  description:
    "Tap-first profile cards for teams, events, and directories. Fast, accessible, and built for the web.",
  icons: {
    icon: [
      { url: "/Hexacards_Icons.png", type: "image/png", sizes: "100x100" },
    ],
    apple: [{ url: "/Hexacards_Icons.png", type: "image/png", sizes: "100x100" }],
    shortcut: "/Hexacards_Icons.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} ${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <OfferBannerDialog />
        {children}
      </body>
    </html>
  );
}
