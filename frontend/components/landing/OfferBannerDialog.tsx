"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  DEFAULT_HOME_OFFER,
  fetchOfferForPage,
  type HomeOffer,
} from "@/lib/offers-api";

function shouldSkipPath(pathname: string) {
  const p = pathname || "/";
  return (
    p.startsWith("/super-admin") ||
    p.startsWith("/dashboard") ||
    p.startsWith("/login") ||
    p.startsWith("/checkout") ||
    p.startsWith("/thank-you") ||
    p.startsWith("/api") ||
    p.startsWith("/privacy-policy") ||
    p.startsWith("/shipping-delivery-policy") ||
    p.startsWith("/return-refund-policy")
  );
}

function isSafeOfferHref(href: string) {
  const v = href.trim();
  if (!v || /^data:/i.test(v) || v.length > 2000) return false;
  return v.startsWith("/") || /^https?:\/\//i.test(v);
}

/**
 * Site-wide offer dialog: loads the active banner configured for the
 * current URL path (preset pages or any pasted custom path).
 */
export default function OfferBannerDialog({
  page,
  pagePath,
}: {
  /** @deprecated prefer automatic host via pagePath / pathname */
  page?: string;
  pagePath?: string;
} = {}) {
  const pathname = usePathname() || "/";
  const targetPath = pagePath || page || pathname;

  const [offer, setOffer] = useState<HomeOffer | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (shouldSkipPath(pathname) && !pagePath && !page) {
      setOpen(false);
      setOffer(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const next = await fetchOfferForPage(targetPath);
      if (cancelled) return;
      setOffer(next);
      setOpen(Boolean(next.active));
    })();
    return () => {
      cancelled = true;
    };
  }, [targetPath, pathname, page, pagePath]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev || "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setOpen(false);
    document.body.style.overflow = "";
  }

  const imageUrl = offer?.imageUrl || DEFAULT_HOME_OFFER.imageUrl;
  const linkUrl = offer?.linkUrl || DEFAULT_HOME_OFFER.linkUrl;
  const href = isSafeOfferHref(linkUrl) ? linkUrl : DEFAULT_HOME_OFFER.linkUrl;
  const external = /^https?:\/\//i.test(href);
  const safeImage =
    imageUrl.startsWith("data:") ? DEFAULT_HOME_OFFER.imageUrl : imageUrl;

  return (
    <AnimatePresence mode="wait">
      {open ? (
        <motion.div
          key={`offer-banner-${targetPath}`}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button
            type="button"
            aria-label="Close offer"
            className="absolute inset-0 bg-[#141414]/55 backdrop-blur-[2px]"
            onClick={close}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="HexaCards offer"
            className="relative z-[1] w-[min(480px,86vw,72vh)] overflow-hidden rounded-2xl bg-[#0b0b0b] shadow-[0_24px_80px_rgba(20,20,20,0.4)] sm:w-[min(520px,78vw,70vh)] sm:rounded-3xl"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="absolute top-2.5 right-2.5 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/95 text-[#141414] shadow-md ring-1 ring-black/10 transition hover:bg-white sm:top-3 sm:right-3 sm:h-11 sm:w-11"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>

            <a
              href={href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              onClick={() => {
                setOpen(false);
                document.body.style.overflow = "";
              }}
              className="relative block aspect-square w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BC7C10]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={safeImage}
                alt="HexaCards offer"
                width={1080}
                height={1080}
                className="block h-full w-full object-contain"
              />
            </a>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
