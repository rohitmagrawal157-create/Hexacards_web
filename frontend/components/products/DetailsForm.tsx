"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Link2,
  ImagePlus,
  X,
  Check,
} from "lucide-react";
import { getProduct } from "@/lib/product-catalog";
import { goToCheckout } from "@/lib/auth";

export type OrderPlatform = "instagram" | "youtube" | "google";

type OrderFormConfig = {
  platform: OrderPlatform;
  productId: string;
  backHref: string;
  linkLabel: string;
  linkPlaceholder: string;
  logoLabel: string;
  logoHint: string;
};

const ORDER_FORM_CONFIG: Record<string, OrderFormConfig> = {
  "instagram-card": {
    platform: "instagram",
    productId: "instagram-card",
    backHref: "/product/instagram-card",
    linkLabel: "Your Instagram link",
    linkPlaceholder: "https://instagram.com/yourhandle",
    logoLabel: "Your Instagram logo",
    logoHint: "Upload your profile logo or brand mark (PNG, JPG)",
  },
  "youtube-card": {
    platform: "youtube",
    productId: "youtube-card",
    backHref: "/product/youtube-card",
    linkLabel: "Your YouTube channel link",
    linkPlaceholder: "https://youtube.com/@yourchannel",
    logoLabel: "Your YouTube / channel logo",
    logoHint: "Upload your channel logo or brand mark (PNG, JPG)",
  },
  "google-review-card": {
    platform: "google",
    productId: "google-review-card",
    backHref: "/product/google-review-card",
    linkLabel: "Your Google review link",
    linkPlaceholder: "https://g.page/r/your-review-link",
    logoLabel: "Your business logo",
    logoHint: "Upload your business logo for the card (PNG, JPG)",
  },
  "google-reviews": {
    platform: "google",
    productId: "google-reviews",
    backHref: "/product/google-review-card",
    linkLabel: "Your Google review link",
    linkPlaceholder: "https://g.page/r/your-review-link",
    logoLabel: "Your business logo",
    logoHint: "Upload your business logo for the card (PNG, JPG)",
  },
  "google-standee": {
    platform: "google",
    productId: "google-standee",
    backHref: "/product/google-standee",
    linkLabel: "Your Google review link",
    linkPlaceholder: "https://g.page/r/your-review-link",
    logoLabel: "Your business logo",
    logoHint: "Upload your business logo for the standee (PNG, JPG)",
  },
  "review-stand": {
    platform: "google",
    productId: "review-stand",
    backHref: "/product/google-standee",
    linkLabel: "Your Google review link",
    linkPlaceholder: "https://g.page/r/your-review-link",
    logoLabel: "Your business logo",
    logoHint: "Upload your business logo for the standee (PNG, JPG)",
  },
  "instagram-standee": {
    platform: "instagram",
    productId: "instagram-standee",
    backHref: "/product/instagram-standee",
    linkLabel: "Your Instagram link",
    linkPlaceholder: "https://instagram.com/yourhandle",
    logoLabel: "Your Instagram logo",
    logoHint: "Upload your profile logo or brand mark (PNG, JPG)",
  },
  "youtube-standee": {
    platform: "youtube",
    productId: "youtube-standee",
    backHref: "/product/youtube-standee",
    linkLabel: "Your YouTube channel link",
    linkPlaceholder: "https://youtube.com/@yourchannel",
    logoLabel: "Your YouTube / channel logo",
    logoHint: "Upload your channel logo or brand mark (PNG, JPG)",
  },
};

const PLATFORM_LABEL: Record<OrderPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  google: "Google Reviews",
};

function isLikelyUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function DetailsForm({ productId }: { productId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const config = ORDER_FORM_CONFIG[productId] ?? ORDER_FORM_CONFIG["instagram-card"];
  const product = getProduct(config.productId);

  const [link, setLink] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [errors, setErrors] = useState<{ link?: string; logo?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const thumb =
    product.media.find((m) => m.type === "image") ?? product.media[0];
  const thumbSrc = thumb.type === "image" ? thumb.src : thumb.thumbnail;

  const platformName = PLATFORM_LABEL[config.platform];

  const canSubmit = useMemo(
    () => link.trim().length > 0 && Boolean(logoPreview),
    [link, logoPreview],
  );

  function onLogoPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((e) => ({ ...e, logo: "Please upload an image file (PNG or JPG)." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, logo: "Logo must be under 5 MB." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(String(reader.result));
      setLogoName(file.name);
      setErrors((e) => ({ ...e, logo: undefined }));
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    setLogoPreview(null);
    setLogoName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function validate() {
    const next: { link?: string; logo?: string } = {};
    if (!link.trim()) {
      next.link = `${config.linkLabel} is required.`;
    } else if (!isLikelyUrl(link)) {
      next.link = "Enter a valid link starting with https://";
    }
    if (!logoPreview) {
      next.logo = `${config.logoLabel} is required.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const payload = {
      productId: config.productId,
      platform: config.platform,
      productTitle: product.shortTitle,
      businessName: businessName.trim(),
      link: link.trim(),
      logoDataUrl: logoPreview,
      logoName,
      price: product.price,
      image: thumbSrc,
      savedAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem("hexaOrderDetails", JSON.stringify(payload));
      sessionStorage.setItem(
        "hexaCardDesign",
        JSON.stringify({
          title: businessName.trim() || product.shortTitle,
          moreDetails: `${platformName}: ${link.trim()}`,
          hasLogo: Boolean(logoPreview),
          cardMode: config.platform,
        }),
      );
    } catch {
      // sessionStorage may be full/blocked — continue to checkout anyway
    }

    goToCheckout(router, "/checkout");
  }

  return (
    <section className="bg-[#FFFCF7]">
      <div className="border-b border-black/[0.06] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3 sm:px-8 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase sm:text-xs">
              Order details
            </p>
            <h1 className="truncate text-base font-extrabold tracking-tight text-[#141414] sm:text-lg">
              {product.ctaLabel}
            </h1>
          </div>
          <Link
            href={config.backHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#BC7C10] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F3F4F6] ring-1 ring-black/10">
            <Image
              src={thumbSrc}
              alt={product.shortTitle}
              fill
              className="object-contain p-1.5"
              sizes="64px"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.12em] text-[#BC7C10] uppercase">
              {platformName}
            </p>
            <p className="truncate text-sm font-bold text-[#141414] sm:text-base">
              {product.title}
            </p>
            <p className="mt-0.5 text-xs text-[#5c5346]">
              Share your link & logo — we program and print for you
            </p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="businessName"
                className="block text-sm font-semibold text-[#141414]"
              >
                Business / brand name{" "}
                <span className="font-normal text-[#5c5346]">(optional)</span>
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Invictus Web Solutions"
                className="mt-2 w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 text-sm text-[#141414] outline-none transition-colors placeholder:text-[#5c5346]/50 focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20"
              />
            </div>

            <div>
              <label
                htmlFor="platformLink"
                className="flex items-center gap-2 text-sm font-semibold text-[#141414]"
              >
                <Link2 className="h-4 w-4 text-[#BC7C10]" />
                {config.linkLabel}
                <span className="text-[#E24C4C]">*</span>
              </label>
              <input
                id="platformLink"
                type="url"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  if (errors.link) setErrors((er) => ({ ...er, link: undefined }));
                }}
                placeholder={config.linkPlaceholder}
                className={`mt-2 w-full rounded-xl border bg-[#FFFCF7] px-4 py-3 text-sm text-[#141414] outline-none transition-colors placeholder:text-[#5c5346]/50 focus:ring-2 focus:ring-[#BC7C10]/20 ${
                  errors.link
                    ? "border-[#E24C4C] focus:border-[#E24C4C]"
                    : "border-black/10 focus:border-[#BC7C10]"
                }`}
              />
              {errors.link ? (
                <p className="mt-1.5 text-xs font-medium text-[#E24C4C]">
                  {errors.link}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-[#5c5346]">
                  Paste the full URL customers should open on tap or scan.
                </p>
              )}
            </div>

            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-[#141414]">
                <ImagePlus className="h-4 w-4 text-[#BC7C10]" />
                {config.logoLabel}
                <span className="text-[#E24C4C]">*</span>
              </p>
              <p className="mt-1 text-xs text-[#5c5346]">{config.logoHint}</p>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={(e) => onLogoPick(e.target.files?.[0])}
              />

              {logoPreview ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-black/10 bg-[#FFFCF7] p-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#141414]">
                      {logoName || "Logo uploaded"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#16803C]">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Ready for print
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearLogo}
                    aria-label="Remove logo"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c5346] transition-colors hover:bg-black/5 hover:text-[#141414]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={`mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-colors hover:border-[#BC7C10]/50 hover:bg-[#FFF8ED]/60 ${
                    errors.logo
                      ? "border-[#E24C4C]/50 bg-[#FFF5F5]"
                      : "border-black/15 bg-[#FFFCF7]"
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#BC7C10]/12 text-[#BC7C10]">
                    <ImagePlus className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-[#141414]">
                    Click to upload logo
                  </span>
                  <span className="text-xs text-[#5c5346]">
                    PNG, JPG or WebP · max 5 MB
                  </span>
                </button>
              )}
              {errors.logo ? (
                <p className="mt-1.5 text-xs font-medium text-[#E24C4C]">
                  {errors.logo}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#BC7C10] py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Saving…" : "Continue to checkout"}
            <ArrowRight className="h-4 w-4" />
          </button>

          {!canSubmit ? (
            <p className="mt-3 text-center text-xs text-[#5c5346]">
              Add your {platformName.toLowerCase()} link and logo to continue.
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
