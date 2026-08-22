import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { productCatalog, type CatalogProduct } from "@/lib/product-catalog";

export type CatalogEntry = {
  id: string;
  href: string;
  badge?: string;
};

type CatalogItem = {
  product: CatalogProduct;
  href: string;
  badge?: string;
};

/** Full catalog order for /products */
export const FULL_CATALOG_ORDER: CatalogEntry[] = [
  {
    id: "nfc-business-card",
    href: "/product/nfc-business-card",
    badge: "Popular",
  },
  { id: "digital-profile-qr", href: "/product/digital-profile-qr" },
  {
    id: "google-review-card",
    href: "/product/google-review-card",
    badge: "Social",
  },
  { id: "instagram-card", href: "/product/instagram-card", badge: "Social" },
  { id: "youtube-card", href: "/product/youtube-card", badge: "Social" },
  { id: "google-standee", href: "/product/google-standee", badge: "Standee" },
  {
    id: "instagram-standee",
    href: "/product/instagram-standee",
    badge: "Standee",
  },
  { id: "youtube-standee", href: "/product/youtube-standee", badge: "Standee" },
  { id: "review-keychain-qr", href: "/product/review-keychain-qr" },
  { id: "metal-card", href: "/product/metal-card" },
  { id: "pvc-card", href: "/product/pvc-card" },
  { id: "wooden-card", href: "/product/wooden-card" },
];

/** Social Media Cards category — 1 Google, 2 Instagram, 3 YouTube */
export const SOCIAL_MEDIA_CATALOG: CatalogEntry[] = [
  {
    id: "google-review-card",
    href: "/product/google-review-card",
    badge: "Google",
  },
  {
    id: "instagram-card",
    href: "/product/instagram-card",
    badge: "Instagram",
  },
  {
    id: "youtube-card",
    href: "/product/youtube-card",
    badge: "YouTube",
  },
];

/** Review Standee category — 1 Google, 2 Instagram, 3 YouTube */
export const STANDEE_CATALOG: CatalogEntry[] = [
  {
    id: "google-standee",
    href: "/product/google-standee",
    badge: "Google",
  },
  {
    id: "instagram-standee",
    href: "/product/instagram-standee",
    badge: "Instagram",
  },
  {
    id: "youtube-standee",
    href: "/product/youtube-standee",
    badge: "YouTube",
  },
];

function formatInr(n: number) {
  return `₹${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function CatalogCard({ item }: { item: CatalogItem }) {
  const { product, href, badge } = item;
  const image =
    product.media.find((m) => m.type === "image") ?? product.media[0];
  const imageSrc = image.type === "image" ? image.src : image.thumbnail;
  const discount = Math.round(
    (1 - product.price / product.compareAtPrice) * 100,
  );

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06] transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-[#BC7C10]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BC7C10]"
    >
      <div className="relative aspect-square overflow-hidden bg-[#F3F4F6]">
        {badge ? (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-[#BC7C10] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase">
            {badge}
          </span>
        ) : null}
        {discount > 0 ? (
          <span className="absolute top-3 right-3 z-10 rounded-full bg-[#141414] px-2.5 py-1 text-[10px] font-bold text-white">
            {discount}% OFF
          </span>
        ) : null}
        <Image
          src={imageSrc}
          alt={image.alt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-105 sm:p-6"
        />
      </div>

      <div className="flex flex-1 flex-col px-4 pt-4 pb-5">
        <p className="text-[10px] font-bold tracking-[0.12em] text-[#BC7C10] uppercase">
          {product.category}
        </p>
        <h3 className="mt-1 text-base leading-snug font-bold text-[#141414] sm:text-lg">
          {product.shortTitle}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#5c5346] sm:text-sm">
          {product.description}
        </p>

        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-extrabold text-[#141414]">
            {formatInr(product.price)}
          </span>
          {product.compareAtPrice > product.price ? (
            <span className="text-sm text-[#5c5346]/70 line-through">
              {formatInr(product.compareAtPrice)}
            </span>
          ) : null}
        </div>

        <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#BC7C10] transition-colors group-hover:text-[#9a650d]">
          View Product
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

type ProductsCatalogProps = {
  entries?: CatalogEntry[];
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Tighter 3-column layout for category hubs */
  compact?: boolean;
};

/** Product catalog grid — full catalog or filtered category */
export default function ProductsCatalog({
  entries = FULL_CATALOG_ORDER,
  eyebrow = "All products",
  title = "Choose a card, open the details",
  description = "Instagram, YouTube, Google Reviews, NFC business cards, stands, and more — tap any product to view full details.",
  compact = false,
}: ProductsCatalogProps) {
  const items: CatalogItem[] = entries
    .map(({ id, href, badge }) => ({
      product: productCatalog[id],
      href,
      badge,
    }))
    .filter((item) => Boolean(item.product));

  return (
    <section className="bg-[#FFFCF7] py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <p className="text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#141414] sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-sm text-[#5c5346] sm:text-base">
            {description}
          </p>
        </div>

        <ul
          className={`grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-5 lg:gap-6 ${
            compact
              ? "lg:grid-cols-3 xl:grid-cols-3"
              : "lg:grid-cols-3 xl:grid-cols-4"
          }`}
        >
          {items.map((item) => (
            <li key={item.product.id}>
              <CatalogCard item={item} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
