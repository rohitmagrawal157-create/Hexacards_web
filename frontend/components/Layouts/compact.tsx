"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  Globe,
  FileText,
  MapPin,
  UserPlus,
  Share2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Home,
  Camera,
} from "lucide-react";
import {
  FaWhatsapp,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
  FaYoutube,
  FaGoogle,
  FaTelegramPlane,
  FaSnapchatGhost,
  FaPinterestP,
} from "react-icons/fa";
import { SiTripadvisor } from "react-icons/si";
import CardContactForm from "@/components/user-dashboard/CardContactForm";
import CardLayoutFooter from "./CardLayoutFooter";
import CardShareModal from "./CardShareModal";
import {
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
  formatDialNumber,
  openBrochureDownload,
  phoneDigitsForLink,
  resolveCardAccent,
  type HexaCardProfile,
} from "@/lib/card-profile";

type CompactProps = {
  profile: HexaCardProfile;
  onChangeBackground?: () => void;
  onChangeProfile?: () => void;
};

type TabKey = "contact" | "socials" | "contactMe";

function ActionRow({
  icon: Icon,
  label,
  value,
  href,
  accent,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href: string;
  accent: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white px-3.5 py-3 transition-colors hover:bg-[#FAFBFC]"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: `${accent}14`,
          color: accent,
        }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-[#8a8a92]">{label}</p>
        <p className="truncate text-sm font-semibold text-[#141414]">{value}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#c4c4cc]" />
    </a>
  );
}

function QuickIcon({
  icon: Icon,
  href,
  onClick,
  label,
  accent,
}: {
  icon: typeof Phone;
  href?: string;
  onClick?: () => void;
  label: string;
  accent: string;
}) {
  const className =
    "flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 hover:opacity-90";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={className}
        style={{ backgroundColor: accent }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <a
      href={href || "#"}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
      aria-label={label}
      className={className}
      style={{ backgroundColor: accent }}
      onClick={(e) => {
        if (!href || href === "#") e.preventDefault();
      }}
    >
      <Icon className="h-[18px] w-[18px]" />
    </a>
  );
}

/** Pill tab switcher — Contact Info / Socials / Contact Me */
function TabSwitcher({
  active,
  onChange,
  accent,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  accent: string;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "contact", label: "Contact Info" },
    { key: "socials", label: "Socials" },
    { key: "contactMe", label: "Contact Me" },
  ];

  return (
    <div className="mb-5 flex w-full gap-1 rounded-xl border border-black/[0.06] bg-black/[0.03] p-1">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 ${
              isActive ? "text-white shadow-md" : "text-[#8a8a92] hover:text-[#141414]"
            }`}
            style={isActive ? { backgroundColor: accent } : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact card layout — tabbed Contact / Socials / Contact Me for a denser card.
 * Uses the same HexaCardProfile data as Classic / Basic / Modern.
 */
export default function Compact({
  profile,
  onChangeBackground,
  onChangeProfile,
}: CompactProps) {
  const [waShareNumber, setWaShareNumber] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("contact");

  const accentTheme = resolveCardAccent(profile.appearance.accentColor);
  const accent = accentTheme.solid;
  const accentSoft = accentTheme.soft;
  const accentMuted = accentTheme.muted;

  const name =
    profile.contact.cardName.trim() || profile.contact.businessName || "Your Name";
  const titleLine = [profile.contact.title.trim(), profile.contact.businessName.trim()]
    .filter(Boolean)
    .join(" - ");
  const country = profile.contact.countryCode || "IN";
  const coverUrl = profile.appearance.coverImage || DEFAULT_CARD_BANNER;
  const avatarUrl = profile.appearance.logoImage || DEFAULT_CARD_AVATAR;
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
  const services = (profile.business.services ?? []).filter((s) => s.trim());
  const about = profile.business.about?.trim() || "";
  const hasBrochure = Boolean(profile.contact.brochureName);

  const mobileDigits = mobile ? phoneDigitsForLink(country, mobile) : "";
  const waDigits = whatsapp ? phoneDigitsForLink(country, whatsapp) : "";

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

  async function handleBrochure() {
    if (!hasBrochure) return;
    const opened = await openBrochureDownload(profile.contact.brochureName);
    if (!opened) {
      window.alert("Brochure file not found. Please re-upload it in Edit card.");
    }
  }

  const socialLinks = [
    { label: "Facebook", Icon: FaFacebookF, bg: "#1877F2", href: profile.social.facebook },
    { label: "Instagram", Icon: FaInstagram, bg: "#C13584", href: profile.social.instagram },
    { label: "LinkedIn", Icon: FaLinkedinIn, bg: "#0A66C2", href: profile.social.linkedin },
    { label: "Twitter", Icon: FaTwitter, bg: "#1DA1F2", href: profile.social.twitter },
    { label: "YouTube", Icon: FaYoutube, bg: "#FF0000", href: profile.social.youtube },
    { label: "Telegram", Icon: FaTelegramPlane, bg: "#229ED9", href: profile.social.telegram },
    { label: "Snapchat", Icon: FaSnapchatGhost, bg: "#FFFC00", href: profile.social.snapchat },
    { label: "Pinterest", Icon: FaPinterestP, bg: "#E60023", href: profile.social.pinterest },
    { label: "Google", Icon: FaGoogle, bg: "#4285F4", href: profile.social.googleReview },
    { label: "Tripadvisor", Icon: SiTripadvisor, bg: "#34E0A1", href: profile.social.tripadvisor },
  ].filter((s) => s.href && s.href.trim());

  return (
    <div
      className="mx-auto max-w-[520px] overflow-hidden rounded-2xl border-2 bg-[#F3F5FA] shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
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

      <div className="bg-white pb-5">
        {/* Banner with profile logo centered inside */}
        <div
          className={`relative flex h-52 w-full items-center justify-center overflow-hidden bg-[#e8eaee] sm:h-60 ${
            onChangeBackground ? "cursor-pointer" : ""
          }`}
          style={{
            backgroundImage: `url("${coverUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
          role={onChangeBackground ? "button" : undefined}
          tabIndex={onChangeBackground ? 0 : undefined}
          onClick={() => onChangeBackground?.()}
          onKeyDown={(e) => {
            if (!onChangeBackground) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChangeBackground();
            }
          }}
          aria-label={
            onChangeBackground ? "Change background image" : undefined
          }
        >
          {onChangeBackground ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeBackground();
              }}
              aria-label="Change background image"
              className="absolute right-3 bottom-3 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-[#CED0D4] bg-white text-[#050505] shadow-sm"
            >
              <Camera className="h-[15px] w-[15px]" strokeWidth={2.25} />
            </button>
          ) : null}

          <div
            className="relative z-20"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <div className="flex h-[100px] w-[100px] items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-[#f5f5f4] shadow-[0_10px_28px_rgba(0,0,0,0.22)] sm:h-[112px] sm:w-[112px]">
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
                  className="absolute right-1 bottom-1 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-[#CED0D4] bg-white text-[#050505] shadow-sm"
                >
                  <Camera className="h-[15px] w-[15px]" strokeWidth={2.25} />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 px-4 text-center">
          <h1 className="font-dashboard text-xl font-extrabold text-[#0f0f12]">
            {name}
          </h1>
          {titleLine ? (
            <p className="mt-1 text-sm text-[#8a8a92]">{titleLine}</p>
          ) : (
            <p className="mt-1 text-sm text-[#8a8a92]">Hexa NFC Business Card</p>
          )}
        </div>

        {/* Quick icons */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 px-4">
          {mobileDigits ? (
            <QuickIcon
              icon={Phone}
              href={`tel:+${mobileDigits}`}
              label="Call"
              accent={accent}
            />
          ) : null}
          {waDigits ? (
            <QuickIcon
              icon={FaWhatsapp as typeof Phone}
              href={`https://wa.me/${waDigits}`}
              label="WhatsApp"
              accent={accent}
            />
          ) : null}
          {hasBrochure ? (
            <QuickIcon
              icon={FileText}
              onClick={() => void handleBrochure()}
              label="Brochure"
              accent={accent}
            />
          ) : null}
          {websiteHref ? (
            <QuickIcon
              icon={Globe}
              href={websiteHref}
              label="Website"
              accent={accent}
            />
          ) : null}
          <QuickIcon
            icon={UserPlus}
            href="#save-contact"
            label="Add to contacts"
            accent={accent}
          />
          <QuickIcon
            icon={Share2}
            onClick={() => setShareModalOpen(true)}
            label="Share"
            accent={accent}
          />
        </div>

        {/* Tab switcher: Contact Info / Socials / Contact Me */}
        <div className="mt-6 px-4">
          <TabSwitcher active={activeTab} onChange={setActiveTab} accent={accent} />

          {/* Contact Info tab */}
          {activeTab === "contact" ? (
            <div className="flex flex-col gap-2.5">
              {mobile ? (
                <ActionRow
                  icon={Phone}
                  label="Mobile"
                  value={formatDialNumber(country, mobile)}
                  href={`tel:+${mobileDigits}`}
                  accent={accent}
                />
              ) : null}
              {email ? (
                <ActionRow
                  icon={Mail}
                  label="Email"
                  value={email}
                  href={`mailto:${email}`}
                  accent={accent}
                />
              ) : null}
              {websiteRaw ? (
                <ActionRow
                  icon={Globe}
                  label="Website"
                  value={websiteRaw.replace(/^https?:\/\//i, "")}
                  href={websiteHref}
                  accent={accent}
                />
              ) : null}
              {whatsapp ? (
                <ActionRow
                  icon={FaWhatsapp as typeof Phone}
                  label="WhatsApp"
                  value={formatDialNumber(country, whatsapp)}
                  href={`https://wa.me/${waDigits}`}
                  accent={accent}
                />
              ) : null}
              {fullAddress ? (
                <ActionRow
                  icon={MapPin}
                  label="Address"
                  value={fullAddress}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                  accent={accent}
                />
              ) : null}
              {!mobile && !email && !websiteRaw && !whatsapp && !fullAddress ? (
                <p className="py-6 text-center text-sm text-[#8a8a92]">
                  Add contact details in Edit card.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Socials tab */}
          {activeTab === "socials" ? (
            <div>
              {socialLinks.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                  {socialLinks.map(({ label, Icon, bg, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-black/[0.07] bg-[#FCFCFB] p-2.5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${bg}14`, color: bg }}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 truncate text-xs font-semibold text-[#252529]">
                        {label === "Twitter" ? "Twitter / X" : label}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-[#8a8a92]">
                  Add social links in Edit card.
                </p>
              )}
            </div>
          ) : null}

          {/* Contact Me tab — opens contact form */}
          {activeTab === "contactMe" ? (
            <div className="rounded-xl border border-black/[0.06] bg-white p-4">
              <CardContactForm accentColor={accent} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Business info — collapsible */}
      <div className="mx-4 mt-4 mb-5">
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
            <div className="overflow-hidden px-5 pt-5 pb-6">
              <h3 className="text-base font-bold text-[#141414]">
                Business Information
              </h3>
              <p className="mt-2 max-w-full text-sm leading-relaxed break-words [overflow-wrap:anywhere] text-[#4a4a52]">
                {about ||
                  (profile.contact.businessName
                    ? `${profile.contact.businessName} — connect instantly through this Hexa digital card.`
                    : "Add company details in Edit card.")}
              </p>
              <h4 className="mt-4 text-sm font-semibold text-[#141414]">
                Services / Products
              </h4>
              {services.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[#3d4657] break-words [overflow-wrap:anywhere]">
                  {services.map((service, index) => (
                    <li key={`${service}-${index}`}>{service}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-[#8a8a92]">
                  Add services from the Business Info tab.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <CardLayoutFooter accent={accent} />

      <CardShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        accent={accent}
        cardName={name}
      />
    </div>
  );
}