"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

type Product = {
  title: string;
  description: string;
  image: string;
  href: string;
};

const products: Product[] = [
  {
    title: "Digital Business Card",
    description:
      "Your full digital identity on NFC and QR — share contacts, links, and leads in one tap.",
    image: "/Images/Products/digitalCard.jpg",
    href: "/product/nfc-business-card",
  },
  {
    title: "Digital Profile + QR",
    description:
      "Print-ready QR that opens your profile instantly. No app, no friction, works on every phone.",
    image: "/Images/Products/digitalQR.jpg",
    href: "/product/digital-profile-qr",
  },
  {
    title: "Social Media Cards",
    description:
      "Google, Instagram & YouTube cards — pick a platform and share in one tap.",
    image: "/Images/Products/googleReview.jpg",
    href: "/product/social-media-cards",
  },
  {
    title: "Google Review Standee",
    description:
      "Google, Instagram & YouTube standees — pick a platform for your counter.",
    image: "/Images/Products/reviewStandy.jpg",
    href: "/product/google-review-standee",
  },
  {
    title: "Review Keychain QR",
    description:
      "Tap or scan keychain that opens your Google review page — always with you on your keys.",
    image: "/Images/Products/keychain-front-back.jpg",
    href: "/product/review-keychain-qr",
  },
];

function RevealHeading() {
  const words: { text: string; gradient?: boolean; lineBreak?: boolean }[] = [
    { text: "Five", gradient: true },
    { text: "products." },
    { text: "One", gradient: true },
    { text: "tap", lineBreak: true },
    { text: "to", gradient: true },
    { text: "grow" },
    { text: "your", gradient: true },
    { text: "business." },
  ];

  return (
    <h2 className="text-center text-4xl font-bold leading-tight text-[#141414] sm:text-5xl">
      {words.map((word, i) => (
        <span key={i}>
          <span
            className={`inline-block animate-[revealUp_0.6s_ease-out_both] ${
              word.gradient ? "text-[#BC7C10]" : "text-[#141414]"
            }`}
            style={{ animationDelay: `${150 + i * 90}ms` }}
          >
            {word.text}
          </span>{" "}
          {word.lineBreak ? <br /> : null}
        </span>
      ))}
    </h2>
  );
}

function RevealSubtext() {
  const words = [
    "Digital",
    "profile,",
    "QR,",
    "review",
    "cards,",
    "stands,",
    "and",
    "keychains",
    "—",
    "built",
    "to",
    "connect",
    "and",
    "convert.",
  ];

  return (
    <p className="mt-3 text-center text-lg text-[#7a7a82]">
      {words.map((word, i) => (
        <span
          key={i}
          className="mr-1.5 inline-block animate-[revealUp_0.5s_ease-out_both]"
          style={{ animationDelay: `${800 + i * 60}ms` }}
        >
          {word}
        </span>
      ))}
    </p>
  );
}

function ProductCard({ item }: { item: Product }) {
  return (
    <Link
      href={item.href}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BC7C10] focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F3F4F6] sm:aspect-square">
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 62vw, (max-width: 1024px) 42vw, 23vw"
          className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-105 sm:p-5"
        />
        {/* <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#BC7C10] uppercase shadow-sm ring-1 ring-[#BC7C10]/20 sm:text-[11px]">
          View Product
        </span> */}
      </div>

      <div className="flex flex-1 flex-col px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5">
        <h3 className="text-[13px] leading-snug font-semibold text-[#141414] sm:text-base lg:text-lg">
          {item.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[#5c5346] sm:mt-2 sm:line-clamp-3 sm:text-sm">
          {item.description}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#BC7C10] transition-colors group-hover:text-[#9a650d] sm:mt-4 sm:text-xs">
          View Product
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function ProductsGrid() {
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function scrollByCard(direction: "prev" | "next") {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll by roughly one card's width (first child's width + gap)
    // rather than a hardcoded pixel value, so this stays correct across
    // the different card widths at each breakpoint.
    const card = el.firstElementChild as HTMLElement | null;
    const amount = card ? card.offsetWidth + 20 : 320;
    el.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  return (
    <div ref={sectionRef} className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="mx-auto mb-8 max-w-2xl text-center lg:mb-10">
        <p className="mb-3 text-xs font-bold tracking-[0.15em] text-[#BC7C10] uppercase sm:text-sm">
          Products
        </p>
        {hasAnimated ? (
          <>
            <RevealHeading />
            <RevealSubtext />
          </>
        ) : (
          <div className="min-h-[5.5rem] sm:min-h-[6rem]" aria-hidden />
        )}
      </div>

      {/* Horizontal snap-scroll slider, replacing the old 2/4-column
          grid — with 5 items a fixed grid always orphans one card on
          its own row at some breakpoint. Scroll-snap keeps cards
          aligned as the user swipes/scrolls instead. Scrollbar is
          hidden (cross-browser) since the arrow buttons below and
          direct touch/drag scrolling are the intended way to navigate. */}
      <ul
        ref={scrollerRef}
        className="flex list-none snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth p-0 pb-1 sm:gap-5 lg:gap-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((item) => (
          <li
            key={item.title}
            className="w-[62%] shrink-0 snap-start sm:w-[42%] lg:w-[23%]"
          >
            <ProductCard item={item} />
          </li>
        ))}
      </ul>

      {/* Arrow controls — placed below the slider. Visible on all
          screen sizes now (not desktop-only) since hiding the
          scrollbar removes the only other visual cue that this row
          scrolls, so touch users benefit from these too, not just
          mouse/trackpad users. */}
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => scrollByCard("prev")}
          aria-label="Scroll products left"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-[#141414] transition-colors hover:border-[#BC7C10] hover:text-[#BC7C10]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard("next")}
          aria-label="Scroll products right"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-[#141414] transition-colors hover:border-[#BC7C10] hover:text-[#BC7C10]"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function Products() {
  return (
    <section
      id="products"
      className="scroll-mt-20 bg-white pt-8 pb-14 sm:pt-10 sm:pb-16"
    >
      <ProductsGrid />
    </section>
  );
}