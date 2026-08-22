"use client";

import { useState } from "react";
import {
  Phone,
  FileText,
  Globe,
  UserPlus,
  Share2,
  Mail,
  MapPin,
  Home,
  ChevronDown,
  ChevronUp,
  Smartphone,
} from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
  FaYoutube,
  FaGoogle,
  FaWhatsapp,
  FaTelegramPlane,
  FaSnapchatGhost,
  FaPinterestP,
} from "react-icons/fa";
import { SiTripadvisor } from "react-icons/si";
import BasicLayout from "./BasicLayout";
import CardContactForm from "@/components/user-dashboard/CardContactForm";
import CardLayoutFooter from "./CardLayoutFooter";
import CardShareModal from "./CardShareModal";
import {
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
  formatDialNumber,
  phoneDigitsForLink,
  resolveCardAccent,
  type HexaCardProfile,
} from "@/lib/card-profile";

export type BasicProfile = {
  contact: {
    cardName?: string;
    title?: string;
    mobile?: string;
    email?: string;
    website?: string;
    address?: string;
    countryCode?: string;
    whatsapp?: string;
  };
  appearance: {
    accentColor: string;
    coverImage?: string | null;
    avatarImage?: string | null;
    logoImage?: string | null;
  };
  business?: {
    name?: string;
    about?: string;
    services?: string[];
  };
  social?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    googleReview?: string;
    telegram?: string;
    snapchat?: string;
    pinterest?: string;
    tripadvisor?: string;
  };
};

type BasicProps = {
  profile: BasicProfile | HexaCardProfile;
  onChangeBackground?: () => void;
  onChangeProfile?: () => void;
};

function normalizeProfile(profile: BasicProfile | HexaCardProfile): BasicProfile {
  const p = profile as HexaCardProfile;
  if (p.contact && "businessName" in p.contact) {
    return {
      contact: {
        cardName: p.contact.cardName,
        title: [p.contact.title, p.contact.businessName]
          .filter(Boolean)
          .join(" - "),
        mobile: p.contact.mobile,
        email: p.contact.email,
        website: p.contact.website,
        address: [p.contact.address, p.contact.city, p.contact.state]
          .filter(Boolean)
          .join(", "),
        countryCode: p.contact.countryCode,
        whatsapp: p.contact.whatsapp,
      },
      appearance: {
        accentColor: p.appearance.accentColor,
        coverImage: p.appearance.coverImage,
        avatarImage: p.appearance.logoImage,
        logoImage: p.appearance.logoImage,
      },
      business: {
        name: p.contact.businessName || undefined,
        about: p.business?.about,
        services: p.business?.services ?? [],
      },
      social: {
        facebook: p.social?.facebook,
        instagram: p.social?.instagram,
        linkedin: p.social?.linkedin,
        twitter: p.social?.twitter,
        youtube: p.social?.youtube,
        googleReview: p.social?.googleReview,
        telegram: p.social?.telegram,
        snapchat: p.social?.snapchat,
        pinterest: p.social?.pinterest,
        tripadvisor: p.social?.tripadvisor,
      },
    };
  }
  return profile as BasicProfile;
}

export default function Basic({
  profile: rawProfile,
  onChangeBackground,
  onChangeProfile,
}: BasicProps) {
  const profile = normalizeProfile(rawProfile);
  const [businessOpen, setBusinessOpen] = useState(true);
  const [waShareNumber, setWaShareNumber] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const accentTheme = resolveCardAccent(profile.appearance.accentColor);
  const accent = accentTheme.solid;
  const accentSoft = accentTheme.soft;
  const accentMuted = accentTheme.muted;
  const services = Array.isArray(profile.business?.services)
    ? profile.business.services.filter((s) => s.trim())
    : [];
  const name = profile.contact.cardName || "";
  const country = profile.contact.countryCode || "IN";
  const avatarUrl =
    profile.appearance.avatarImage ||
    profile.appearance.logoImage ||
    DEFAULT_CARD_AVATAR;
  const coverUrl = profile.appearance.coverImage || DEFAULT_CARD_BANNER;
  const mobile = profile.contact.mobile?.trim() || "";
  const whatsapp = profile.contact.whatsapp?.trim() || mobile;
  const websiteRaw = profile.contact.website?.trim() || "";
  const websiteHref = websiteRaw
    ? /^https?:\/\//i.test(websiteRaw)
      ? websiteRaw
      : `https://${websiteRaw}`
    : "";

  const mobileDigits = mobile
    ? phoneDigitsForLink(country, mobile)
    : "";
  const waDigits = whatsapp
    ? phoneDigitsForLink(country, whatsapp)
    : "";

  function handleWhatsAppShare(toNumber?: string) {
    const text = `Hi, check out my HexaCards digital profile`;
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

  const actionIcons = [
    {
      label: "Call",
      Icon: Phone,
      href: mobileDigits ? `tel:+${mobileDigits}` : undefined,
    },
    {
      label: "WhatsApp",
      Icon: FaWhatsapp,
      href: waDigits ? `https://wa.me/${waDigits}` : undefined,
    },
    { label: "Brochure", Icon: FileText, href: "#brochure" },
    {
      label: "Website",
      Icon: Globe,
      href: websiteHref || undefined,
    },
    { label: "Add to contacts", Icon: UserPlus, href: "#save-contact" },
    {
      label: "Share",
      Icon: Share2,
      onClick: () => setShareModalOpen(true),
    },
  ];

  const socialLinks = [
    {
      label: "Facebook",
      Icon: FaFacebookF,
      bg: "#1877F2",
      href: profile.social?.facebook,
    },
    {
      label: "Instagram",
      Icon: FaInstagram,
      bg: "#C13584",
      href: profile.social?.instagram,
    },
    {
      label: "LinkedIn",
      Icon: FaLinkedinIn,
      bg: "#0A66C2",
      href: profile.social?.linkedin,
    },
    {
      label: "Twitter",
      Icon: FaTwitter,
      bg: "#1DA1F2",
      href: profile.social?.twitter,
    },
    {
      label: "YouTube",
      Icon: FaYoutube,
      bg: "#FF0000",
      href: profile.social?.youtube,
    },
    {
      label: "Telegram",
      Icon: FaTelegramPlane,
      bg: "#229ED9",
      href: profile.social?.telegram,
    },
    {
      label: "Snapchat",
      Icon: FaSnapchatGhost,
      bg: "#FFFC00",
      href: profile.social?.snapchat,
    },
    {
      label: "Pinterest",
      Icon: FaPinterestP,
      bg: "#E60023",
      href: profile.social?.pinterest,
    },
    {
      label: "Google",
      Icon: FaGoogle,
      bg: "#4285F4",
      href: profile.social?.googleReview,
    },
    {
      label: "Tripadvisor",
      Icon: SiTripadvisor,
      bg: "#34E0A1",
      href: profile.social?.tripadvisor,
    },
  ].filter((s) => s.href && s.href.trim());

  const infoCardClass =
    "rounded-xl border bg-white p-3 text-left transition-colors hover:bg-[#FAFAF8]";

  return (
    <div
      className="mx-auto max-w-[520px] overflow-hidden rounded-2xl border-2 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
      style={{ borderColor: accent }}
    >
      {/* WhatsApp share bar */}
      <div
        className="flex items-center justify-between gap-2 border-b bg-white px-4 py-2"
        style={{ borderColor: accentSoft }}
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

      <BasicLayout
        name={name}
        titleLine={profile.contact.title}
        coverUrl={coverUrl}
        avatarUrl={avatarUrl}
        accent={accent}
        onChangeBackground={onChangeBackground}
        onChangeProfile={onChangeProfile}
      />

      {/* 6-icon action row — accent fills like Classic CTAs */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 px-4 sm:gap-3.5">
        {actionIcons.map(({ label, Icon, href, onClick }) => {
          const className =
            "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 hover:opacity-90";
          if (onClick) {
            return (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={onClick}
                className={className}
                style={{ backgroundColor: accent }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            );
          }
          return (
            <a
              key={label}
              href={href || "#"}
              aria-label={label}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noreferrer" : undefined}
              className={className}
              style={{ backgroundColor: accent }}
              onClick={(e) => {
                if (!href || href === "#") e.preventDefault();
              }}
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          );
        })}
      </div>

      {/* Contact grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 px-4">
        {mobile ? (
          <a
            href={`tel:+${mobileDigits}`}
            className={infoCardClass}
            style={{ borderColor: accentMuted }}
          >
            <div className="flex items-center gap-2" style={{ color: accent }}>
              <Smartphone className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="text-xs text-[#a0a0a8]">Mobile</span>
            </div>
            <p className="mt-1.5 break-words text-[13px] leading-snug font-semibold text-[#0f0f12]">
              {formatDialNumber(country, mobile)}
            </p>
          </a>
        ) : null}

        {profile.contact.email ? (
          <a
            href={`mailto:${profile.contact.email.trim()}`}
            className={infoCardClass}
            style={{ borderColor: accentMuted }}
          >
            <div className="flex items-center gap-2" style={{ color: accent }}>
              <Mail className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="text-xs text-[#a0a0a8]">Email</span>
            </div>
            <p className="mt-1.5 truncate text-[13px] font-semibold text-[#0f0f12]">
              {profile.contact.email}
            </p>
          </a>
        ) : null}

        {profile.contact.address ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.contact.address)}`}
            target="_blank"
            rel="noreferrer"
            className={`col-span-2 ${infoCardClass}`}
            style={{ borderColor: accentMuted }}
          >
            <div className="flex items-center gap-2" style={{ color: accent }}>
              <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="text-xs text-[#a0a0a8]">Address</span>
            </div>
            <p className="mt-1.5 text-[13px] leading-snug font-semibold text-[#0f0f12]">
              {profile.contact.address}
            </p>
          </a>
        ) : null}
      </div>

      {/* Collapsible Business Information */}
      <div className="mt-6 px-4">
        <button
          type="button"
          onClick={() => setBusinessOpen((v) => !v)}
          aria-expanded={businessOpen}
          className={`flex w-full items-center justify-between px-4 py-3 text-white transition-opacity hover:opacity-90 ${
            businessOpen ? "rounded-t-xl" : "rounded-xl"
          }`}
          style={{ backgroundColor: accent }}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Home className="h-4 w-4" />
            Business Information
          </span>
          {businessOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {businessOpen ? (
          <div
            className="rounded-b-xl border border-t-0 bg-white"
            style={{ borderColor: accentMuted }}
          >
            <div className="overflow-hidden p-5">
              <h3 className="text-lg font-bold text-[#0f0f12]">
                Business Information
              </h3>
              <p className="mt-2 max-w-full text-sm leading-relaxed break-words [overflow-wrap:anywhere] text-[#4a4a52]">
                {profile.business?.about?.trim() ||
                  profile.business?.name ||
                  "Add company details in Edit card."}
              </p>

              <h4 className="mt-5 text-base font-bold text-[#0f0f12]">
                Services
              </h4>
              {services.length > 0 ? (
                <ul className="mt-3 space-y-2.5">
                  {services.map((service, index) => (
                    <li
                      key={`${service}-${index}`}
                      className="flex items-start gap-2"
                    >
                      <span
                        className="mt-1.5 h-0 w-0 shrink-0 border-y-[5px] border-l-[7px] border-y-transparent"
                        style={{ borderLeftColor: accent }}
                        aria-hidden
                      />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere] text-sm text-[#0f0f12]">{service}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[#8a8a92]">
                  Add services from the Business Info tab.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {socialLinks.length > 0 ? (
        <div className="mx-4 mt-6 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
          <h3 className="text-sm font-bold text-[#0f0f12]">
            Social Media Links
          </h3>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {socialLinks.map(({ label, Icon, bg, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                title={label}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105"
                style={{ backgroundColor: bg }}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 px-4 pb-2">
        <CardContactForm accentColor={accent} />
      </div>

      <CardLayoutFooter accent={accent} />

      <CardShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        accent={accent}
        cardName={name || "HexaCards"}
      />
    </div>
  );
}
