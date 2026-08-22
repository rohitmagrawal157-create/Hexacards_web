"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import HeroHexBackground from "./HeroHexBackground";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SLIDE_BG = "bg-white";
const HERO_BANNER = "/Images/banner.png";

const DEFAULT_STATS = [
  { value: "1M+", label: "Connections made" },
  { value: "10k+", label: "Active users" },
  { value: "50+", label: "Global brands" },
] as const;

type Slide = {
  badgeBg: string;
  badgeText: string;
  badgeDotBg: string;
  badgeLabel: string;
  headline: ReactNode;
  sub: string;
  ctaHref: string;
  ctaLabel: string;
  ctaBg: string;
  ctaText: string;
  stats?: { value: string; label: string }[];
};

const slide: Slide = {
  badgeBg: "bg-[#FFFCF6]",
  badgeText: "text-[#BC7C10]",
  badgeDotBg: "bg-[#BC7C10]",
  badgeLabel: "Premium NFC Contact Cards",
  headline: (
    <>
      <span className="block">
        The <em className="italic text-[#BC7C10]">last</em> business
      </span>
      <span className="block">card you&apos;ll</span>
      <span className="block">
        ever <em className="italic text-[#BC7C10]">buy</em>.
      </span>
    </>
  ),
  sub: "Share your contact with unlimited people by tapping on their phone. Explore all your information in one tap.",
  ctaHref: "#products",
  ctaLabel: "Get Your Card",
  ctaBg: "bg-[#FFFCF6] hover:bg-[#F5E6C8]",
  ctaText: "text-[#BC7C10]",
  stats: [...DEFAULT_STATS],
};

export default function Hero() {
  return (
    <section
      id="top"
      className={`relative overflow-x-clip overflow-y-visible ${SLIDE_BG}`}
      aria-labelledby="hero-heading"
    >
      <div className={`relative overflow-visible ${SLIDE_BG} min-h-[780px]`}>
        <HeroHexBackground />

        <div className="relative z-10 mx-auto grid h-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-10 pb-20 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:pt-12 lg:pb-24">
          <div className="hero-rise-stagger">
            <span
              className={`inline-flex items-center gap-2 rounded-full ${slide.badgeBg} px-5 py-2.5 text-sm font-semibold ${slide.badgeText}`}
            >
              <span className={`h-2 w-2 rounded-full ${slide.badgeDotBg}`} />
              {slide.badgeLabel}
            </span>

            <h1
              id="hero-heading"
              className={`${playfair.className} mt-7 text-4xl leading-[1.12] tracking-tight text-[#141414] sm:text-5xl lg:text-[3.35rem] xl:text-6xl`}
            >
              {slide.headline}
            </h1>

            <div className="mt-7">
              <Link
                href="/product/nfc-business-card"
                className="inline-flex items-center gap-2 rounded-full bg-[#BC7C10] px-7 py-3.5 text-base font-semibold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.98] sm:px-8 sm:py-4 sm:text-lg"
              >
                Design Your Card
                <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
              </Link>
            </div>

            <p className="mt-6 max-w-md text-lg leading-relaxed text-[#4F5B72] sm:text-xl">
              {slide.sub}
            </p>

            <div className="mt-9">
              <a
                href={slide.ctaHref}
                className={`inline-flex items-center rounded-full ${slide.ctaBg} px-8 py-4 text-base font-semibold ${slide.ctaText} shadow-lg shadow-black/10 transition-transform active:scale-[0.98] sm:px-10 sm:py-5 sm:text-lg`}
              >
                {slide.ctaLabel}
              </a>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
              {(slide.stats ?? DEFAULT_STATS).map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <p className="text-2xl font-extrabold tracking-tight text-[#BC7C10] sm:text-3xl">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm leading-snug text-[#141414]/70">
                      {stat.label}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="hero-card-enter relative z-10 flex min-h-[440px] items-center justify-center lg:min-h-[500px]">
            <div className="relative w-full max-w-[520px]">
              <Image
                src={HERO_BANNER}
                alt="Hexa Cards NFC card and digital profile on phone"
                width={500}
                height={500}
                priority
                unoptimized
                className="h-auto w-full bg-transparent object-contain"
                sizes="(max-width: 1024px) 90vw, 520px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
