"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  cardsEqual,
  clearHomeCategoriesCache,
  fetchHomeCategories,
  type HomeCategoryCard,
} from "@/lib/home-categories";

function RevealHeading({ count }: { count: number }) {
  const label =
    count === 1
      ? "One"
      : count === 2
        ? "Two"
        : count === 3
          ? "Three"
          : count === 4
            ? "Four"
            : count === 5
              ? "Five"
              : String(count);

  const words: { text: string; gradient?: boolean; lineBreak?: boolean }[] = [
    { text: label, gradient: true },
    { text: count === 1 ? "product." : "products." },
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

function ProductCard({ item }: { item: HomeCategoryCard }) {
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

function CategorySkeleton() {
  return (
    <li className="w-[62%] shrink-0 snap-start sm:w-[42%] lg:w-[23%]">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="aspect-[4/5] animate-pulse bg-[#F3F4F6] sm:aspect-square" />
        <div className="space-y-2 px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5">
          <div className="h-4 w-2/3 animate-pulse rounded bg-[#F3F4F6]" />
          <div className="h-3 w-full animate-pulse rounded bg-[#F3F4F6]" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-[#F3F4F6]" />
        </div>
      </div>
    </li>
  );
}

function ProductsGrid() {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [categories, setCategories] = useState<HomeCategoryCard[] | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(force = false) {
      if (force) clearHomeCategoriesCache();
      const { cards } = await fetchHomeCategories();
      if (cancelled) return;
      setCategories((prev) => {
        if (prev && cardsEqual(prev, cards)) return prev;
        return cards;
      });
      setReady(true);
    }

    void load();

    function onCatalogChange() {
      void load(true);
    }

    window.addEventListener("hexa-admin-products-change", onCatalogChange);
    return () => {
      cancelled = true;
      window.removeEventListener("hexa-admin-products-change", onCatalogChange);
    };
  }, []);

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
    const card = el.firstElementChild as HTMLElement | null;
    const amount = card ? card.offsetWidth + 20 : 320;
    el.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  const count = categories?.length ?? 5;

  return (
    <div ref={sectionRef} className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="mx-auto mb-8 max-w-2xl text-center lg:mb-10">
        <p className="mb-3 text-xs font-bold tracking-[0.15em] text-[#BC7C10] uppercase sm:text-sm">
          Products
        </p>
        {hasAnimated ? (
          <>
            <RevealHeading count={count} />
            <RevealSubtext />
          </>
        ) : (
          <div className="min-h-[5.5rem] sm:min-h-[6rem]" aria-hidden />
        )}
      </div>

      <ul
        ref={scrollerRef}
        className="flex list-none snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth p-0 pb-1 sm:gap-5 lg:gap-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {!ready || !categories ? (
          <>
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
          </>
        ) : (
          categories.map((item) => (
            <li
              key={item.id}
              className="w-[62%] shrink-0 snap-start sm:w-[42%] lg:w-[23%]"
            >
              <ProductCard item={item} />
            </li>
          ))
        )}
      </ul>

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
