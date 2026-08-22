"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
  ArrowLeft,
  Truck,
  UserRound,
  Share2,
} from "lucide-react";
import { getProduct, type CatalogProduct } from "@/lib/product-catalog";

function formatInr(n: number) {
  return `₹${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

const trustBadges = [
  { label: "Fast Shipping", icon: "truck" as const },
  { label: "Digital Card Included", icon: "user" as const },
  { label: "Unlimited Sharing", icon: "share" as const },
  { label: "Made in India", icon: "india" as const },
];

function IndiaFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden role="img">
      <rect width="30" height="20" fill="#FF9933" />
      <rect y="6.67" width="30" height="6.66" fill="#FFFFFF" />
      <rect y="13.33" width="30" height="6.67" fill="#138808" />
      <circle
        cx="15"
        cy="10"
        r="2.4"
        fill="none"
        stroke="#000080"
        strokeWidth="0.7"
      />
      <circle cx="15" cy="10" r="0.45" fill="#000080" />
    </svg>
  );
}

export default function ProductDetails({
  productId = "nfc-business-card",
  product: productProp,
  backHref = "/",
  backLabel = "Back",
}: {
  productId?: string;
  product?: CatalogProduct;
  backHref?: string;
  backLabel?: string;
}) {
  const product = productProp ?? getProduct(productId);
  const media = product.media;
  const price = product.price;
  const compareAtPrice = product.compareAtPrice;
  const discountPercent = Math.round((1 - price / compareAtPrice) * 100);

  const [activeIndex, setActiveIndex] = useState(0);
  const active = media[activeIndex] ?? media[0];

  function prev() {
    setActiveIndex((i) => (i - 1 + media.length) % media.length);
  }
  function next() {
    setActiveIndex((i) => (i + 1) % media.length);
  }

  return (
    <section className="bg-[#FFFFFF]">
      <div className="border-b border-black/[0.06] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-3 sm:gap-3 sm:px-8 sm:py-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase sm:text-xs">
              Product
            </p>
            <h1 className="text-base font-extrabold tracking-tight text-[#141414] sm:text-lg lg:text-xl">
              {product.shortTitle}
            </h1>
            <p className="ml-auto hidden text-xs text-[#5c5346] lg:block">
              Design online · Approve · We print & ship
            </p>
          </div>
          <Link
            href={backHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#BC7C10] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-8 sm:gap-10 sm:px-8 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-12">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-black/[0.06] bg-[#F3F4F6] shadow-[0_16px_48px_rgba(15,23,42,0.06)] sm:rounded-3xl">
            {active.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.src}
                alt={active.alt}
                className="h-full w-full object-contain p-4 sm:p-6"
              />
            ) : (
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${active.youtubeId}?modestbranding=1&rel=0`}
                title={active.alt}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}

            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 text-[#141414] shadow-md transition-transform hover:scale-105"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 text-[#141414] shadow-md transition-transform hover:scale-105"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {media.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`View media ${i + 1}`}
                aria-current={i === activeIndex}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-colors sm:h-16 sm:w-16 ${
                  i === activeIndex
                    ? "border-[#BC7C10]"
                    : "border-black/[0.06] hover:border-black/15"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.type === "image" ? item.src : item.thumbnail}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
                {item.type === "video" ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Play className="h-4 w-4 fill-white text-white" />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            {product.category}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#141414] sm:text-3xl">
            {product.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#5c5346] sm:text-base">
            {product.description}
          </p>

          <ul className="mt-4 space-y-2">
            {product.highlights.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-[#5c5346]"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#BC7C10]/12 text-[#BC7C10]">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-extrabold text-[#141414] sm:text-3xl">
              {formatInr(price)}
            </span>
            <span className="text-base text-[#5c5346]/70 line-through">
              {formatInr(compareAtPrice)}
            </span>
            <span className="rounded-full bg-[#BC7C10]/12 px-2.5 py-1 text-xs font-bold text-[#BC7C10]">
              {discountPercent}% OFF
            </span>
          </div>
          <p className="mt-1.5 text-xs text-[#5c5346]">
            Inclusive of design support · Pay after you approve the mockup
          </p>

          <Link
            href={product.ctaHref}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#BC7C10] py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99]"
          >
            {product.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>

          <a
            href="https://api.whatsapp.com/send?phone=919226286898"
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-3 transition-opacity hover:opacity-95"
          >
            <span className="flex min-w-0 flex-1 flex-col justify-center rounded-2xl bg-[#25D366] px-4 py-2.5 text-white shadow-sm">
              <span className="flex items-center gap-2 text-xs font-medium text-white/95">
                Contact HexaCards
                <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                  Online
                </span>
              </span>
              <span className="mt-0.5 text-sm font-bold sm:text-base">
                Looking for free design assistance?
              </span>
            </span>
          </a>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex flex-col items-center gap-1.5 text-center"
              >
                <span className="flex h-9 w-9 items-center justify-center text-[#141414]">
                  {badge.icon === "truck" ? (
                    <Truck className="h-6 w-6" strokeWidth={1.75} />
                  ) : badge.icon === "user" ? (
                    <UserRound className="h-6 w-6" strokeWidth={1.75} />
                  ) : badge.icon === "share" ? (
                    <Share2 className="h-6 w-6" strokeWidth={1.75} />
                  ) : (
                    <IndiaFlag className="h-5 w-7 rounded-[2px] shadow-sm" />
                  )}
                </span>
                <p className="text-[11px] leading-tight font-medium text-[#141414] sm:text-xs">
                  {badge.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-bold tracking-wide text-[#BC7C10] uppercase">
              Available finishes
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {product.finishes.map((f) => (
                <div
                  key={f.name}
                  className="rounded-xl bg-[#FFFCF7] px-3 py-2.5 ring-1 ring-black/[0.04]"
                >
                  <p className="text-sm font-semibold text-[#141414]">
                    {f.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#5c5346]">{f.hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-bold tracking-wide text-[#BC7C10] uppercase">
              What’s included
            </p>
            <ul className="mt-3 space-y-2">
              {product.included.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-[#5c5346]"
                >
                  <Check
                    className="h-4 w-4 shrink-0 text-[#BC7C10]"
                    strokeWidth={2.5}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
