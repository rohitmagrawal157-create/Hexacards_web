"use client";

import { useState } from "react";
import {
  Phone,
  Share2,
  Camera,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import CardContactForm from "@/components/user-dashboard/CardContactForm";
import CardLayoutFooter from "./CardLayoutFooter";
import CardShareModal from "./CardShareModal";
import {
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
  openBrochureDownload,
  phoneDigitsForLink,
  resolveCardAccent,
  type HexaCardProfile,
} from "@/lib/card-profile";

type SocialProps = {
  profile: HexaCardProfile;
  onChangeBackground?: () => void;
  onChangeProfile?: () => void;
};

/** HexaCards brand icons in /public/icons (Social layout only) */
const SOCIAL_ICONS = {
  facebook: "/icons/Hexacards_Icons-01.png",
  instagram: "/icons/Hexacards_Icons-02.png",
  linkedin: "/icons/Hexacards_Icons-03.png",
  youtube: "/icons/Hexacards_Icons-04.png",
  googleReview: "/icons/Hexacards_Icons-09.png",
  telegram: "/icons/Hexacards_Icons-05.png",
  whatsapp: "/icons/Hexacards_Icons-06.png",
  snapchat: "/icons/Hexacards_Icons-07.png",
  website: "/icons/Hexacards_Icons-08.png",
  pinterest: "/icons/Hexacards_Icons-10.png",
  email: "/icons/Hexacards_Icons-11.png",
  twitter: "/icons/Hexacards_Icons-12.png",
  maps: "/icons/Hexacards_Icons-13.png",
  tripadvisor: "/icons/Hexacards_Icons-14.png",
  call: "/icons/Hexacards_Icons-15.png",
  pdf: "/icons/Hexacards_Icons-16.png",
} as const;

type GridItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  imageSrc?: string;
  /** Extra zoom to crop padding around brand marks */
  imageScale?: number;
  imagePosition?: string;
  /** contain = show full logo (Tripadvisor); cover = fill tile */
  imageFit?: "cover" | "contain";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon?: any;
  bg?: string;
};

const ICON_TILE =
  "relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-transparent transition group-hover:-translate-y-0.5 sm:h-16 sm:w-16";

function GridIconTile({
  label,
  href,
  onClick,
  imageSrc,
  imageScale = 1.12,
  imagePosition = "center",
  imageFit = "cover",
  Icon,
  bg,
}: GridItem) {
  const inner = (
    <>
      {imageSrc ? (
        <span className={ICON_TILE}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt=""
            className={`pointer-events-none absolute inset-0 h-full w-full ${
              imageFit === "contain" ? "object-contain p-1.5" : "object-cover"
            }`}
            style={{
              transform: imageFit === "contain" ? undefined : `scale(${imageScale})`,
              objectPosition: imagePosition,
            }}
          />
        </span>
      ) : (
        <span
          className={`${ICON_TILE} flex items-center justify-center`}
          style={{ backgroundColor: bg || "#141414", color: "#fff" }}
        >
          {Icon ? <Icon className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" /> : null}
        </span>
      )}
      <span className="w-full max-w-[5.5rem] px-0.5 text-center text-[10px] font-semibold leading-snug text-[#4a4a52] line-clamp-2 sm:text-[11px]">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="group flex w-full min-w-0 flex-col items-center gap-1.5"
      >
        {inner}
      </button>
    );
  }

  return (
    <a
      href={href || "#"}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
      aria-label={label}
      title={label}
      className="group flex w-full min-w-0 flex-col items-center gap-1.5"
      onClick={(e) => {
        if (!href || href === "#") e.preventDefault();
      }}
    >
      {inner}
    </a>
  );
}

/**
 * Social card layout — brand PNG icons for contact + social grids.
 */
export default function Social({
  profile,
  onChangeBackground,
  onChangeProfile,
}: SocialProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [waShareNumber, setWaShareNumber] = useState("");

  const accentTheme = resolveCardAccent(profile.appearance.accentColor);
  const accent = accentTheme.solid;
  const accentMuted = accentTheme.muted;

  const name =
    profile.contact.cardName.trim() ||
    profile.contact.businessName.trim() ||
    "Your Name";
  const titleLine = profile.contact.title.trim();
  const businessName = profile.contact.businessName.trim();
  const bio = profile.business.about?.trim() || "";
  const services = (profile.business.services ?? []).filter((s) => s.trim());
  const coverUrl = profile.appearance.coverImage || DEFAULT_CARD_BANNER;
  const avatarUrl = profile.appearance.logoImage || DEFAULT_CARD_AVATAR;
  const country = profile.contact.countryCode || "IN";
  const mobile = profile.contact.mobile?.trim() || "";
  const whatsapp = profile.contact.whatsapp?.trim() || mobile;
  const email = profile.contact.email?.trim() || "";
  const websiteRaw = profile.contact.website?.trim() || "";
  const websiteHref = websiteRaw
    ? /^https?:\/\//i.test(websiteRaw)
      ? websiteRaw
      : `https://${websiteRaw}`
    : "";
  const fullAddress = [
    profile.contact.address,
    profile.contact.city,
    profile.contact.state,
  ]
    .filter(Boolean)
    .join(", ");

  const mobileDigits = mobile ? phoneDigitsForLink(country, mobile) : "";
  const waDigits = whatsapp ? phoneDigitsForLink(country, whatsapp) : "";
  const hasBrochure = Boolean(profile.contact.brochureName);

  function handleWhatsAppShare(toNumber?: string) {
    const text = "Hi, check out my HexaCards digital profile";
    const digits = (toNumber || "").replace(/\D/g, "");
    if (digits) {
      if (digits.length !== 10) {
        window.alert("Enter a 10-digit WhatsApp number.");
        return;
      }
      const dial = phoneDigitsForLink(country, digits);
      window.open(
        `https://wa.me/${dial}?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function handleBrochure() {
    if (!hasBrochure) return;
    const opened = await openBrochureDownload(profile.contact.brochureName);
    if (!opened) {
      window.alert("Brochure file not found. Please re-upload it in Edit card.");
    }
  }

  const contactItems: GridItem[] = [];
  if (mobileDigits) {
    contactItems.push({
      label: "Call",
      href: `tel:+${mobileDigits}`,
      bg: "#34A853",
      imageSrc: SOCIAL_ICONS.call,
    });
  }
  if (waDigits) {
    contactItems.push({
      label: "WhatsApp",
      href: `https://wa.me/${waDigits}`,
      imageSrc: SOCIAL_ICONS.whatsapp,
    });
  }
  if (email) {
    contactItems.push({
      label: "Email",
      href: `mailto:${email}`,
      imageSrc: SOCIAL_ICONS.email,
    });
  }
  if (websiteHref) {
    contactItems.push({
      label: "Website",
      href: websiteHref,
      imageSrc: SOCIAL_ICONS.website,
    });
  }
  if (fullAddress) {
    contactItems.push({
      label: "Location",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
      imageSrc: SOCIAL_ICONS.maps,
    });
  }
  if (hasBrochure) {
    contactItems.push({
      label: "Brochure",
      onClick: () => void handleBrochure(),
      bg: "#BC7C10",
      imageSrc: SOCIAL_ICONS.pdf,
    });
  }

  const socialItems: GridItem[] = (
    [
      {
        label: "Facebook",
        href: profile.social.facebook,
        imageSrc: SOCIAL_ICONS.facebook,
      },
      {
        label: "Instagram",
        href: profile.social.instagram,
        imageSrc: SOCIAL_ICONS.instagram,
      },
      {
        label: "LinkedIn",
        href: profile.social.linkedin,
        imageSrc: SOCIAL_ICONS.linkedin,
      },
      {
        label: "YouTube",
        href: profile.social.youtube,
        imageSrc: SOCIAL_ICONS.youtube,
      },
      {
        label: "Google Reviews",
        href: profile.social.googleReview,
        imageSrc: SOCIAL_ICONS.googleReview,
      },
      {
        label: "X",
        href: profile.social.twitter,
        imageSrc: SOCIAL_ICONS.twitter,
      },
      {
        label: "Telegram",
        href: profile.social.telegram,
        imageSrc: SOCIAL_ICONS.telegram,
      },
      {
        label: "Snapchat",
        href: profile.social.snapchat,
        imageSrc: SOCIAL_ICONS.snapchat,
      },
      
      {
        label: "Pinterest",
        href: profile.social.pinterest,
        imageSrc: SOCIAL_ICONS.pinterest,
      },
     
      {
        label: "Tripadvisor",
        href: profile.social.tripadvisor,
        imageSrc: SOCIAL_ICONS.tripadvisor,
        // Full owl + wordmark — no crop
        imageFit: "contain",
        imageScale: 1,
      },
    ] as const
  ).filter((s) => s.href && s.href.trim());

  return (
    <div
      className="mx-auto max-w-[520px] overflow-hidden rounded-2xl border-2 bg-[#FAFAF8] shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
      style={{ borderColor: accent }}
    >
      {/* WhatsApp share bar */}
      <div
        className="flex items-center justify-between gap-2 border-b bg-white px-4 py-2"
        style={{ borderColor: accentTheme.soft }}
      >
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="Enter WhatsApp Number"
          value={waShareNumber}
          onChange={(e) =>
            setWaShareNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          className="min-w-0 flex-1 bg-transparent text-sm text-[#141414] outline-none placeholder:text-[#a0a0a8]"
        />
        <button
          type="button"
          onClick={() => handleWhatsAppShare(waShareNumber)}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          <FaWhatsapp className="h-4 w-4" />
          Share
        </button>
      </div>

      {/* Branded cover — a bit taller so more image shows */}
      <div
        className="relative min-h-52 bg-cover bg-center sm:min-h-60"
        style={{
          backgroundImage: `url("${coverUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`,
        }}
      >
        <div className="relative flex items-center justify-end gap-2 px-4 pt-4">
          {onChangeBackground ? (
            <button
              type="button"
              onClick={onChangeBackground}
              aria-label="Change background image"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#141414] shadow-sm transition hover:bg-white"
            >
              <Camera className="h-4 w-4" strokeWidth={2.25} />
            </button>
          ) : null}
        </div>

        <div className="relative mt-10 flex justify-center pb-2 sm:mt-12">
          <div className="relative z-10">
            <div
              className="h-28 w-28 overflow-hidden rounded-full border-4 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
              style={{ borderColor: accent }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover object-center"
              />
            </div>
            {onChangeProfile ? (
              <button
                type="button"
                onClick={onChangeProfile}
                aria-label="Change profile picture"
                className="absolute right-0 bottom-0 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white text-[#050505] shadow-sm"
              >
                <Camera className="h-[15px] w-[15px]" strokeWidth={2.25} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Light identity card */}
      <div
        className="relative mx-4 -mt-14 rounded-3xl border bg-white px-5 pt-16 pb-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
        style={{ borderColor: accentMuted }}
      >
        <div className="text-center">
          <h1 className="font-dashboard text-xl font-extrabold text-[#141414]">
            {name}
          </h1>
          {titleLine || businessName ? (
            <p className="mt-1 text-sm font-medium text-[#6b6560]">
              {titleLine}
              {titleLine && businessName ? " @ " : ""}
              {businessName ? (
                <span style={{ color: accent }}>{businessName}</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[#8a8a92]">Hexa NFC Business Card</p>
          )}
          {bio ? (
            <p
              className={`mt-2 max-w-full text-xs leading-relaxed break-words [overflow-wrap:anywhere] text-[#8a8a92] ${
                bioExpanded ? "" : "line-clamp-5"
              }`}
            >
              {bio}
            </p>
          ) : null}

          {bio || services.length > 0 ? (
            <button
              type="button"
              onClick={() => setBioExpanded((v) => !v)}
              aria-expanded={bioExpanded}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold transition-opacity hover:opacity-80"
              style={{ color: accent }}
            >
              {bioExpanded ? "View less" : "View more"}
              {bioExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}

          {bioExpanded && services.length > 0 ? (
            <div
              className="mt-3 rounded-xl border bg-[#FAFAF8] p-3 text-left"
              style={{ borderColor: accentMuted }}
            >
              <h3 className="text-xs font-bold text-[#141414]">
                Services / Products
              </h3>
              <ul className="mt-2 space-y-1.5">
                {services.map((service, index) => (
                  <li
                    key={`${service}-${index}`}
                    className="flex items-start gap-2"
                  >
                    <span
                      className="mt-1.5 h-0 w-0 shrink-0 border-y-[4px] border-l-[6px] border-y-transparent"
                      style={{ borderLeftColor: accent }}
                      aria-hidden
                    />
                    <span className="text-xs text-[#4a4a52]">{service}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <a
            href={
              mobileDigits
                ? `tel:+${mobileDigits}`
                : email
                  ? `mailto:${email}`
                  : "#save-contact"
            }
            className="flex-1 rounded-full py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            Save Contact
          </a>
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            aria-label="Share"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-white transition-colors hover:bg-[#FAFAF8]"
            style={{ borderColor: accentMuted, color: accent }}
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Contact information */}
      <section
        className="mx-4 mt-5 rounded-2xl border border-black/[0.06] bg-[#FAFAF8] p-3.5 sm:p-4"
        style={{ borderColor: accentMuted }}
      >
        <h2 className="text-sm font-extrabold text-[#141414] text-center">
          Contact Information
        </h2>
        {contactItems.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
            {contactItems.map((item) => (
              <GridIconTile key={item.label} {...item} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#8a8a92]">
            Add phone, email, WhatsApp, address, or brochure in Edit card.
          </p>
        )}
      </section>

      {/* Social media */}
      <section
        className="mx-4 mt-4 rounded-2xl border border-black/[0.06] bg-[#FAFAF8] p-3.5 sm:p-4"
        style={{ borderColor: accentMuted }}
      >
        <h2 className="text-sm font-extrabold text-[#141414] text-center">Social Media</h2>
        {socialItems.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
            {socialItems.map((item) => (
              <GridIconTile key={item.label} {...item} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#8a8a92]">
            Add social links in Edit card.
          </p>
        )}
      </section>

      <div className="mx-4 mt-4 mb-2">
        <CardContactForm accentColor={accent} />
      </div>

      <div className="mt-4">
        <CardLayoutFooter accent={accent} />
      </div>

      <CardShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        accent={accent}
        cardName={name}
      />
    </div>
  );
}
