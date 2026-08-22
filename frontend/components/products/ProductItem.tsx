"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

type MediaItem = {
  type: "image";
  src: string;
  alt: string;
};

const media: MediaItem[] = [
  {
    type: "image",
    src: "/Images/Products/digitalCard.jpg",
    alt: "HexaCards NFC digital business card",
  },
  {
    type: "image",
    src: "/Images/Products/productd1.jpg",
    alt: "HexaCards product detail 1",
  },
  {
    type: "image",
    src: "/Images/Products/productd2.jpg",
    alt: "HexaCards product detail 2",
  },
  {
    type: "image",
    src: "/Images/Products/productd3.jpg",
    alt: "HexaCards product detail 3",
  },
  {
    type: "image",
    src: "/Images/Products/productd4.jpg",
    alt: "HexaCards product detail 4",
  },
];

type Product = {
  title: string;
  price: number;
  originalPrice: number;
  rating: number;
  image: string;
  alt: string;
  weight?: string;
  href: string;
};

const products: Product[] = [
  {
    title: "Hexa Cards Original Digital Business Card",
    price: 1599,
    originalPrice: 2000,
    rating: 5,
    image: media[0].src,
    alt: media[0].alt,
    weight: "20g",
    href: "/product/nfc-business-card",
  },
  {
    title: "PVC White Premium Digital Business Card",
    price: 2800,
    originalPrice: 4000,
    rating: 5,
    image: media[1].src,
    alt: media[1].alt,
    weight: "20g",
    href: "/product/pvc-card",
  },
  {
    title: "Silver PVC Digital Business Card",
    price: 2999,
    originalPrice: 3500,
    rating: 5,
    image: media[2].src,
    alt: media[2].alt,
    weight: "20g",
    href: "/product/pvc-card",
  },
  {
    title: "Black Marble PVC Digital Business Card",
    price: 2800,
    originalPrice: 4000,
    rating: 5,
    image: media[3].src,
    alt: media[3].alt,
    weight: "20g",
    href: "/product/pvc-card",
  },
  {
    title: "Black Metal NFC Card with Gold Engraving",
    price: 2399,
    originalPrice: 2899,
    rating: 5,
    image: media[4].src,
    alt: media[4].alt,
    weight: "20g",
    href: "/product/metal-card",
  },
];

function discountPercent(price: number, originalPrice: number) {
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

function formatInr(n: number) {
  return `₹${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

const CARD_WIDTH = 260;
const CARD_GAP = 20;
const STEP = CARD_WIDTH + CARD_GAP;

function ProductCard({ product }: { product: Product }) {
  const discount = discountPercent(product.price, product.originalPrice);

  return (
    <NextLink
      href={product.href}
      style={{ width: CARD_WIDTH }}
      className="group block shrink-0 snap-start"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F7F7F5]">
        {discount > 0 ? (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-[#E24C4C] px-3 py-1 text-xs font-bold text-white">
            -{discount}%
          </span>
        ) : null}
        <Image
          src={product.image}
          alt={product.alt}
          fill
          sizes="260px"
          className="object-cover p-6 transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>

      <div className="mt-4">
        <h3 className="line-clamp-2 text-base leading-snug font-bold text-[#0f0f12] transition-colors group-hover:text-[#BD7F14]">
          {product.title}
        </h3>

        {product.weight ? (
          <p className="mt-1 text-xs font-medium text-[#a0a0a8]">
            {product.weight}
          </p>
        ) : null}

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-[#0f0f12]">
            {formatInr(product.price)}
          </span>
          {product.originalPrice > product.price ? (
            <span className="text-sm text-[#a0a0a8] line-through">
              {formatInr(product.originalPrice)}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < product.rating
                  ? "fill-[#facc15] text-[#facc15]"
                  : "fill-none text-[#d4d4d8]"
              }`}
            />
          ))}
          <span className="ml-1 text-xs font-medium text-[#a0a0a8]">
            ({product.rating}.0)
          </span>
        </div>
      </div>
    </NextLink>
  );
}

export default function ProductItem() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [mounted, setMounted] = useState(false);

  const updateArrowState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollPrev(track.scrollLeft > 4);
    setCanScrollNext(
      track.scrollLeft < track.scrollWidth - track.clientWidth - 4,
    );
  }, []);

  useEffect(() => {
    setMounted(true);
    const track = trackRef.current;
    if (!track) return;
    updateArrowState();
    track.addEventListener("scroll", updateArrowState, { passive: true });
    window.addEventListener("resize", updateArrowState);
    return () => {
      track.removeEventListener("scroll", updateArrowState);
      window.removeEventListener("resize", updateArrowState);
    };
  }, [updateArrowState]);

  const scrollByStep = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * STEP * 2, behavior: "smooth" });
  };

  return (
    <section id="products" className="scroll-mt-20 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0f0f12] sm:text-3xl">
            Our Products
          </h2>

          <div className="flex items-center gap-3">
            <NextLink
              href="/products"
              className="hidden text-sm font-semibold text-[#BD7F14] transition-colors hover:text-[#96650E] sm:inline"
            >
              View all
            </NextLink>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollByStep(-1)}
                disabled={!mounted || !canScrollPrev}
                aria-label="Previous products"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[#0f0f12] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByStep(1)}
                disabled={!mounted || !canScrollNext}
                aria-label="Next products"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[#0f0f12] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={trackRef}
          className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {products.map((product) => (
            <ProductCard key={product.title} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
