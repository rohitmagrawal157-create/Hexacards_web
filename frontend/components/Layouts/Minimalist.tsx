"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  Globe,
  Share2,
  BadgeCheck,
  Home,
  MessageSquare,
  Info,
  Camera,
  FileText,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";
import {
  FaFacebookF,
  FaLinkedinIn,
  FaWhatsapp,
  FaXTwitter,
  FaInstagram,
  FaGoogle,
  FaYoutube,
  FaTelegram,
  FaSnapchat,
  FaPinterestP,
} from "react-icons/fa6";
import { SiTripadvisor } from "react-icons/si";
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

type MinimalistProps = {
  profile: HexaCardProfile;
  onChangeBackground?: () => void;
  onChangeProfile?: () => void;
};

function CircleIcon({
  icon: Icon,
  href,
  onClick,
  label,
  accent,
  bg,
  iconClassName = "h-[18px] w-[18px]",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  href?: string;
  onClick?: () => void;
  label: string;
  accent: string;
  bg?: string;
  iconClassName?: string;
}) {
  const className = bg
    ? "flex h-11 w-11 items-center justify-center rounded-full shadow-md ring-1 ring-black/5 transition-transform hover:scale-105"
    : "flex h-11 w-11 items-center justify-center rounded-full border border-[#CED0D4] bg-white shadow-md ring-1 ring-black/5 transition-transform hover:scale-105";
  const style = bg
    ? { backgroundColor: bg, color: "#fff" }
    : { color: accent };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className={className}
        style={style}
      >
        <Icon className={iconClassName} />
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
      className={className}
      style={style}
      onClick={(e) => {
        if (!href || href === "#") e.preventDefault();
      }}
    >
      <Icon className={iconClassName} />
    </a>
  );
}

function ActionBar({
  label,
  icon: Icon,
  href,
  onClick,
  accent,
  expanded,
}: {
  label: string;
  icon: typeof Home;
  href?: string;
  onClick?: () => void;
  accent: string;
  expanded?: boolean;
}) {
  const content = (
    <div
      className="flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-white shadow-md transition-transform hover:scale-[1.01]"
      style={{ backgroundColor: accent }}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="flex items-center gap-2">
        {typeof expanded === "boolean" ? (
          expanded ? (
            <ChevronUp className="h-4 w-4 opacity-90" />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-90" />
          )
        ) : null}
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Icon className="h-4 w-4" />
        </span>
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        className="block w-full"
      >
        {content}
      </button>
    );
  }

  return (
    <a href={href || "#"} className="block w-full">
      {content}
    </a>
  );
}

/**
 * Minimalist card layout — geometric banner, overlapping avatar,
 * verified name, quick-action circles, pill CTAs, and social row.
 */
export default function Minimalist({
  profile,
  onChangeBackground,
  onChangeProfile,
}: MinimalistProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);

  const accentTheme = resolveCardAccent(profile.appearance.accentColor);
  const accent = accentTheme.solid;
  const accentMuted = accentTheme.muted;

  const name =
    profile.contact.cardName.trim() ||
    profile.contact.businessName.trim() ||
    "Your Name";
  const businessName = profile.contact.businessName.trim();
  const titleLine = [profile.contact.title.trim(), businessName]
    .filter(Boolean)
    .join(" | ");
  const about = profile.business.about?.trim() || "";
  const services = (profile.business.services ?? []).filter((s) => s.trim());
  const avatarUrl = profile.appearance.logoImage || DEFAULT_CARD_AVATAR;
  const coverUrl = profile.appearance.coverImage || DEFAULT_CARD_BANNER;
  const hasBrochure = Boolean(profile.contact.brochureName);

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

  const mobileDigits = mobile ? phoneDigitsForLink(country, mobile) : "";
  const waDigits = whatsapp ? phoneDigitsForLink(country, whatsapp) : "";
  const fullAddress = [
    profile.contact.address,
    profile.contact.city,
    profile.contact.state,
  ]
    .filter(Boolean)
    .join(", ");
  const mapsHref = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : "";

  const socialLinks = [
    { label: "Facebook", Icon: FaFacebookF, href: profile.social.facebook },
    { label: "LinkedIn", Icon: FaLinkedinIn, href: profile.social.linkedin },
    { label: "X", Icon: FaXTwitter, href: profile.social.twitter },
    { label: "Instagram", Icon: FaInstagram, href: profile.social.instagram },
    { label: "YouTube", Icon: FaYoutube, href: profile.social.youtube },
    { label: "Telegram", Icon: FaTelegram, href: profile.social.telegram },
    { label: "Snapchat", Icon: FaSnapchat, href: profile.social.snapchat },
    { label: "Pinterest", Icon: FaPinterestP, href: profile.social.pinterest },
    {
      label: "Google Reviews",
      Icon: FaGoogle,
      href: profile.social.googleReview,
    },
    {
      label: "Tripadvisor",
      Icon: SiTripadvisor,
      href: profile.social.tripadvisor,
    },
  ].filter((s) => s.href && s.href.trim());

  async function handleBrochure() {
    if (!hasBrochure) return;
    const opened = await openBrochureDownload(profile.contact.brochureName);
    if (!opened) {
      window.alert("Brochure file not found. Please re-upload it in Edit card.");
    }
  }

  return (
    <div
      className="mx-auto max-w-[520px] overflow-hidden rounded-2xl border-2 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
      style={{ borderColor: accent }}
    >
      {/* Banner — camera on cover; share outside below cover */}
      <div className="relative">
        <div
          className={`relative h-52 w-full overflow-hidden bg-gradient-to-br from-[#1e5fa8] via-[#2f74c2] to-[#5aa0e0] sm:h-60 ${
            onChangeBackground ? "cursor-pointer" : ""
          }`}
          style={{
            backgroundImage: `url("${coverUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          onClick={() => onChangeBackground?.()}
          onKeyDown={(e) => {
            if (!onChangeBackground) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChangeBackground();
            }
          }}
          role={onChangeBackground ? "button" : undefined}
          tabIndex={onChangeBackground ? 0 : undefined}
          aria-label={onChangeBackground ? "Change background image" : undefined}
        >
          {onChangeBackground ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeBackground();
              }}
              aria-label="Change background image"
              className="absolute right-3 bottom-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[#CED0D4] bg-white text-[#050505] shadow-md ring-1 ring-black/5"
            >
              <Camera className="h-4 w-4" strokeWidth={2.25} />
            </button>
          ) : null}
        </div>

        {/* Share sits outside the background image, under camera */}
        <button
          type="button"
          onClick={() => setShareModalOpen(true)}
          aria-label="Share"
          title="Share"
          className="absolute right-3 top-full z-30 mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-[#CED0D4] bg-white shadow-md ring-1 ring-black/5"
          style={{ color: accent }}
        >
          <Share2 className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>

      {/* Avatar + identity — left aligned */}
      <div className="relative z-10 -mt-14 px-6 pr-16">
        <div className="relative inline-block">
          <div
            className={`h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-[#e8eaee] shadow-md ${
              onChangeProfile ? "cursor-pointer" : ""
            }`}
            onClick={() => onChangeProfile?.()}
            role={onChangeProfile ? "button" : undefined}
            tabIndex={onChangeProfile ? 0 : undefined}
            onKeyDown={(e) => {
              if (!onChangeProfile) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChangeProfile();
              }
            }}
            aria-label={onChangeProfile ? "Change profile picture" : undefined}
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
            {/* <span
              className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm"
              style={{ color: accent }}
              aria-hidden
            >
              <BadgeCheck className="h-4 w-4" />
            </span> */}
        </div>
      </div>

      {/* Name + title only — about lives in Business Information dropdown */}
      <div className="px-6 pt-4 text-left">
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-extrabold text-[#0f0f12]">{name}</h1>
          {/* <BadgeCheck className="h-5 w-5 shrink-0" style={{ color: accent }} /> */}
        </div>
        {titleLine ? (
          <p className="mt-1 text-sm text-[#4a4a52]">{titleLine}</p>
        ) : null}
      </div>

      {/* Quick-action circles — centered; Call / Mail / Web / WhatsApp / Address match */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 px-6">
        {mobileDigits ? (
          <CircleIcon
            icon={Phone}
            href={`tel:+${mobileDigits}`}
            label="Call"
            accent={accent}
          />
        ) : null}
        {email ? (
          <CircleIcon
            icon={Mail}
            href={`mailto:${email}`}
            label="Email"
            accent={accent}
          />
        ) : null}
        {websiteHref ? (
          <CircleIcon
            icon={Globe}
            href={websiteHref}
            label="Website"
            accent={accent}
          />
        ) : null}
        {waDigits ? (
          <CircleIcon
            icon={FaWhatsapp}
            href={`https://wa.me/${waDigits}`}
            label="WhatsApp"
            accent={accent}
            iconClassName="h-[18px] w-[18px]"
          />
        ) : null}
        {mapsHref ? (
          <CircleIcon
            icon={MapPin}
            href={mapsHref}
            label="Address"
            accent={accent}
          />
        ) : null}
      </div>

      {/* Save Contact · Brochure */}
      <div className="mt-4 flex items-center justify-center gap-2.5 px-6">
        <a
          href={
            mobileDigits
              ? `tel:+${mobileDigits}`
              : email
                ? `mailto:${email}`
                : "#save-contact"
          }
          className="min-w-0 flex-1 rounded-full py-2.5 text-center text-[11px] font-bold tracking-wide text-white uppercase shadow-sm transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: accent }}
        >
          Save Contact
        </a>
        {hasBrochure ? (
          <button
            type="button"
            onClick={() => void handleBrochure()}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-center text-[11px] font-bold tracking-wide text-white uppercase shadow-sm transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: accent }}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            Brochure
          </button>
        ) : null}
      </div>

      {/* Social row — centered, includes Google Reviews */}
      {socialLinks.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 px-6">
          {socialLinks.map(({ label, Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              title={label}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: accent }}
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      ) : null}

      {/* Full-width CTA bars */}
      <div className="mt-6 flex flex-col gap-3 px-6 pb-6">
        <div>
          <ActionBar
            label="Business Information"
            icon={Home}
            onClick={() => setBusinessOpen((v) => !v)}
            accent={accent}
            expanded={businessOpen}
          />
          {businessOpen ? (
            <div
              className="mt-2 rounded-2xl border bg-[#FAFAF8] p-4 text-left"
              style={{ borderColor: accentMuted }}
            >
              <p className="max-w-full text-sm leading-relaxed break-words [overflow-wrap:anywhere] text-[#4a4a52]">
                {about ||
                  (businessName
                    ? `${businessName} — connect instantly through this Hexa digital card.`
                    : "Add company details in Edit card.")}
              </p>
              <h3 className="mt-4 text-sm font-bold text-[#141414]">
                Services / Products
              </h3>
              {services.length > 0 ? (
                <ul className="mt-2 space-y-2">
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
                      <span className="min-w-0 break-words [overflow-wrap:anywhere] text-sm text-[#4a4a52]">{service}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[#8a8a92]">
                  Add services from the Business Info tab.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div>
          <ActionBar
            label="Contact Form"
            icon={MessageSquare}
            onClick={() => setContactFormOpen((v) => !v)}
            accent={accent}
            expanded={contactFormOpen}
          />
          {contactFormOpen ? (
            <div
              className="mt-2 overflow-hidden rounded-2xl border bg-white"
              style={{ borderColor: accentMuted }}
            >
              <div className="p-4">
                <CardContactForm accentColor={accent} />
              </div>
            </div>
          ) : null}
        </div>
{/* 
        <ActionBar
          label="Learn More"
          icon={Info}
          href="#learn-more"
          accent={accent}
        /> */}
      </div>

      <div className="overflow-hidden rounded-b-2xl">
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
