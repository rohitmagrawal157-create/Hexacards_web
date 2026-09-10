"use client";

import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa6";

const WHATSAPP_NUMBER = "919226286898";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi Hexa Cards, I’d like to know more.",
)}`;

function shouldHide(pathname: string) {
  const p = pathname || "/";
  return (
    p.startsWith("/super-admin") ||
    p.startsWith("/dashboard") ||
    p.startsWith("/login") ||
    p.startsWith("/checkout") ||
    p.startsWith("/thank-you") ||
    p.startsWith("/api")
  );
}

/** Fixed bottom-right WhatsApp chat button for public pages. */
export default function FloatingWhatsApp() {
  const pathname = usePathname() || "/";
  if (shouldHide(pathname)) return null;

  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="group fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_28px_rgba(37,211,102,0.45)] transition hover:scale-105 hover:bg-[#1ebe57] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] active:scale-95 sm:right-6 sm:bottom-6 sm:h-16 sm:w-16"
    >
      <span
        className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/35 [animation-duration:2.4s]"
        aria-hidden
      />
      <FaWhatsapp className="relative h-8 w-8 sm:h-9 sm:w-9" />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-[#141414] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-md transition group-hover:opacity-100 sm:block">
        Chat with us
      </span>
    </a>
  );
}
