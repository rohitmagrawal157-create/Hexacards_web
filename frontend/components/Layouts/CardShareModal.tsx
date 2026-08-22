"use client";

import { createPortal } from "react-dom";
import { Mail, X } from "lucide-react";
import {
  FaWhatsapp,
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
} from "react-icons/fa";

type CardShareModalProps = {
  open: boolean;
  onClose: () => void;
  accent: string;
  /** Used as email subject / share name */
  cardName?: string;
};

function cardUrl() {
  return typeof window !== "undefined" ? window.location.href : "";
}

function shareWhatsApp() {
  const text = "Hi, check out my HexaCards digital profile";
  window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

const BRAND = {
  WhatsApp: "#25D366",
  Facebook: "#1877F2",
  Twitter: "#1DA1F2",
  LinkedIn: "#0A66C2",
  Email: "#EA4335",
} as const;

/**
 * Shared “Share this card” modal — WhatsApp, Facebook, Twitter, LinkedIn, Email.
 * Used by Classic, Basic, Modern, Compact, and Social layouts.
 */
export default function CardShareModal({
  open,
  onClose,
  accent: _accent,
  cardName = "HexaCards",
}: CardShareModalProps) {
  if (!open || typeof document === "undefined") return null;

  const url = cardUrl();
  const shareLinks = [
    {
      label: "WhatsApp" as const,
      Icon: FaWhatsapp,
      color: BRAND.WhatsApp,
      onClick: () => {
        shareWhatsApp();
        onClose();
      },
    },
    {
      label: "Facebook" as const,
      Icon: FaFacebookF,
      color: BRAND.Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: "Twitter" as const,
      Icon: FaTwitter,
      color: BRAND.Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out my HexaCards digital profile")}&url=${encodeURIComponent(url)}`,
    },
    {
      label: "LinkedIn" as const,
      Icon: FaLinkedinIn,
      color: BRAND.LinkedIn,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      label: "Email" as const,
      Icon: Mail,
      color: BRAND.Email,
      href: `mailto:?subject=${encodeURIComponent(cardName)}&body=${encodeURIComponent(`Check out my digital business card\n${url}`)}`,
    },
  ];

  const iconClass =
    "group flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition-colors";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#141414]">Share this card</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {shareLinks.map(({ label, Icon, color, href, onClick }) => {
            const hoverHandlers = {
              onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                e.currentTarget.style.backgroundColor = "#F5EFE6";
                e.currentTarget.style.color = color;
              },
              onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
                e.currentTarget.style.backgroundColor = color;
                e.currentTarget.style.color = "#fff";
              },
            };

            if (onClick) {
              return (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  aria-label={`Share via ${label}`}
                  className={iconClass}
                  style={{ backgroundColor: color, color: "#fff" }}
                  {...hoverHandlers}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </button>
              );
            }

            return (
              <a
                key={label}
                href={href}
                target={label === "Email" ? undefined : "_blank"}
                rel="noreferrer"
                aria-label={`Share via ${label}`}
                className={iconClass}
                style={{ backgroundColor: color, color: "#fff" }}
                onClick={onClose}
                {...hoverHandlers}
              >
                <Icon className="h-[18px] w-[18px]" />
              </a>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
