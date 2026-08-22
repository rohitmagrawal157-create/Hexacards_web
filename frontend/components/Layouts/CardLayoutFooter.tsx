"use client";

import Image from "next/image";
import { ChevronUp } from "lucide-react";

type CardLayoutFooterProps = {
  accent: string;
};

/**
 * Shared Hexa footer used by every card layout (Classic / Basic / Modern / Compact).
 */
export default function CardLayoutFooter({ accent }: CardLayoutFooterProps) {
  return (
    <div
      className="relative border-t-2 bg-[#f7f7f5] px-4 pt-6 pb-8 text-center"
      style={{ borderColor: accent }}
    >
      <Image
        src="/Images/Hexacards.png"
        alt="Hexa Cards"
        width={180}
        height={50}
        className="mx-auto h-8 w-auto object-contain"
      />
      <a
        href="/products"
        className="mt-3 inline-block text-sm font-bold"
        style={{ color: accent }}
      >
        Create Your Own NFC Card
      </a>
      <button
        type="button"
        aria-label="Scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="absolute right-4 bottom-4 flex h-9 w-9 items-center justify-center rounded-md text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: accent }}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
    </div>
  );
}
