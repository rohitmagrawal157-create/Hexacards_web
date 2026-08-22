"use client";

import { useRef, useState } from "react";
import {
  Camera,
  Phone,
  Mail,
  Globe,
  MapPin,
  UserPlus,
  FileText,
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
import {
  cardPublicUrl,
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
  formatDialNumber,
  normalizeCardLayout,
  openBrochureDownload,
  phoneDigitsForLink,
  resolveCardAccent,
  type HexaCardProfile,
} from "@/lib/card-profile";
import Basic from "@/components/Layouts/Basic";
import Modern from "@/components/Layouts/modern";
import Compact from "@/components/Layouts/compact";
import Social from "@/components/Layouts/social";
import Minimalist from "@/components/Layouts/Minimalist";
import CardLayoutBottom from "@/components/Layouts/CardLayoutBottom";
import CardShareModal from "@/components/Layouts/CardShareModal";

type ProfileBannerProps = {
  profile: HexaCardProfile;
  userName?: string;
  user?: { name: string };
  slug?: string;
  compact?: boolean;
  onUploadBackground?: (file: File) => void;
  onUploadProfile?: (file: File) => void;
};

export default function ProfileBanner({
  profile,
  userName,
  user,
  onUploadBackground,
  onUploadProfile,
}: ProfileBannerProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [waShareNumber, setWaShareNumber] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const accentTheme = resolveCardAccent(profile.appearance.accentColor);
  const accent = accentTheme.solid;
  const accentSoft = accentTheme.soft;
  const accentMuted = accentTheme.muted;
  const cardLayout = normalizeCardLayout(profile.appearance?.layout);
  const name =
    profile.contact.cardName.trim() ||
    userName ||
    user?.name ||
    "HexaCards User";
  const titleLine = [profile.contact.title.trim(), profile.contact.businessName.trim()]
    .filter(Boolean)
    .join(" - ");
  const about =
    profile.business.about.trim() ||
    (profile.contact.businessName
      ? `${profile.contact.businessName} — connect instantly through this Hexa digital card.`
      : "");
  const services = profile.business.services.filter((s) => s.trim());
  const hasBrochure = Boolean(profile.contact.brochureName);
  const shareUrl = cardPublicUrl(profile);

  const ctaClass =
    "flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-semibold text-white transition-opacity hover:opacity-90";
  const infoCardClass =
    "min-w-0 rounded-xl border p-3 text-left transition-colors";

  async function handleBrochureClick() {
    if (!hasBrochure) return;
    const opened = await openBrochureDownload(profile.contact.brochureName);
    if (!opened) {
      window.alert("Brochure file not found. Please re-upload it in Edit card.");
    }
  }

  function handleWhatsAppShare(toNumber?: string) {
    const text = `Hi, check out my HexaCards digital profile:\n${shareUrl}`;
    const digits = (toNumber || "").replace(/\D/g, "");
    if (digits) {
      if (digits.length !== 10) {
        window.alert("Enter a 10-digit WhatsApp number.");
        return;
      }
      const countryDial = phoneDigitsForLink(
        profile.contact.countryCode,
        digits,
      );
      window.open(
        `https://wa.me/${countryDial}?text=${encodeURIComponent(text)}`,
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

  const coverUrl =
    profile.appearance.coverImage ||
    profile.appearance.shareImage ||
    DEFAULT_CARD_BANNER;

  const fullAddress = [
    profile.contact.address,
    profile.contact.city,
    profile.contact.state,
  ]
    .filter(Boolean)
    .join(", ");

  const websiteHref = (() => {
    const raw = profile.contact.website.trim();
    if (!raw) return "";
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  })();

  const mapsHref = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : "";

  const socialLinks = [
    {
      label: "Facebook",
      Icon: FaFacebookF,
      bg: "#1877F2",
      href: profile.social.facebook || "#",
    },
    {
      label: "Instagram",
      Icon: FaInstagram,
      bg: "#C13584",
      href: profile.social.instagram || "#",
    },
    {
      label: "LinkedIn",
      Icon: FaLinkedinIn,
      bg: "#0A66C2",
      href: profile.social.linkedin || "#",
    },
    {
      label: "Twitter",
      Icon: FaTwitter,
      bg: "#1DA1F2",
      href: profile.social.twitter || "#",
    },
    {
      label: "YouTube",
      Icon: FaYoutube,
      bg: "#FF0000",
      href: profile.social.youtube || "#",
    },
    {
      label: "Telegram",
      Icon: FaTelegramPlane,
      bg: "#229ED9",
      href: profile.social.telegram || "#",
    },
    {
      label: "Snapchat",
      Icon: FaSnapchatGhost,
      bg: "#FFFC00",
      href: profile.social.snapchat || "#",
    },
    {
      label: "Pinterest",
      Icon: FaPinterestP,
      bg: "#E60023",
      href: profile.social.pinterest || "#",
    },
    {
      label: "Google",
      Icon: FaGoogle,
      bg: "#4285F4",
      href: profile.social.googleReview || "#",
    },
    {
      label: "Tripadvisor",
      Icon: SiTripadvisor,
      bg: "#34E0A1",
      href: profile.social.tripadvisor || "#",
    },
  ].filter((s) => s.href && s.href !== "#");

  if (cardLayout === "basic") {
    return (
      <>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadBackground) onUploadBackground(file);
            e.target.value = "";
          }}
        />
        <input
          ref={profileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadProfile) onUploadProfile(file);
            e.target.value = "";
          }}
        />
        <Basic
          profile={profile}
          onChangeBackground={
            onUploadBackground
              ? () => coverInputRef.current?.click()
              : undefined
          }
          onChangeProfile={
            onUploadProfile
              ? () => profileInputRef.current?.click()
              : undefined
          }
        />
      </>
    );
  }

  if (cardLayout === "modern") {
    return (
      <>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadBackground) onUploadBackground(file);
            e.target.value = "";
          }}
        />
        <input
          ref={profileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadProfile) onUploadProfile(file);
            e.target.value = "";
          }}
        />
        <Modern
          profile={profile}
          onChangeBackground={
            onUploadBackground
              ? () => coverInputRef.current?.click()
              : undefined
          }
          onChangeProfile={
            onUploadProfile
              ? () => profileInputRef.current?.click()
              : undefined
          }
        />
      </>
    );
  }

  if (cardLayout === "compact") {
    return (
      <>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadBackground) onUploadBackground(file);
            e.target.value = "";
          }}
        />
        <input
          ref={profileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadProfile) onUploadProfile(file);
            e.target.value = "";
          }}
        />
        <Compact
          profile={profile}
          onChangeBackground={
            onUploadBackground
              ? () => coverInputRef.current?.click()
              : undefined
          }
          onChangeProfile={
            onUploadProfile
              ? () => profileInputRef.current?.click()
              : undefined
          }
        />
      </>
    );
  }

  if (cardLayout === "social") {
    return (
      <>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadBackground) onUploadBackground(file);
            e.target.value = "";
          }}
        />
        <input
          ref={profileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadProfile) onUploadProfile(file);
            e.target.value = "";
          }}
        />
        <Social
          profile={profile}
          onChangeBackground={
            onUploadBackground
              ? () => coverInputRef.current?.click()
              : undefined
          }
          onChangeProfile={
            onUploadProfile
              ? () => profileInputRef.current?.click()
              : undefined
          }
        />
      </>
    );
  }

  if (cardLayout === "minimalist") {
    return (
      <>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadBackground) onUploadBackground(file);
            e.target.value = "";
          }}
        />
        <input
          ref={profileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadProfile) onUploadProfile(file);
            e.target.value = "";
          }}
        />
        <Minimalist
          profile={profile}
          onChangeBackground={
            onUploadBackground
              ? () => coverInputRef.current?.click()
              : undefined
          }
          onChangeProfile={
            onUploadProfile
              ? () => profileInputRef.current?.click()
              : undefined
          }
        />
      </>
    );
  }

  return (
    <div
      className="mx-auto max-w-[520px] overflow-hidden rounded-2xl border-2 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
      style={{ borderColor: accent }}
    >
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onUploadBackground) onUploadBackground(file);
          e.target.value = "";
        }}
      />
      <input
        ref={profileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onUploadProfile) onUploadProfile(file);
          e.target.value = "";
        }}
      />

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

      {/* Banner + overlapping profile */}
      <div className="relative">
        <div
          className={`relative h-52 w-full overflow-hidden bg-[#d8dde3] sm:h-60 ${
            onUploadBackground ? "cursor-pointer" : ""
          }`}
          style={{
            backgroundImage: `url("${coverUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
          role={onUploadBackground ? "button" : undefined}
          tabIndex={onUploadBackground ? 0 : undefined}
          onClick={() => {
            if (onUploadBackground) coverInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (!onUploadBackground) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              coverInputRef.current?.click();
            }
          }}
          aria-label={onUploadBackground ? "Change background image" : undefined}
        >
          {onUploadBackground ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                coverInputRef.current?.click();
              }}
              aria-label="Change background image"
              className="absolute right-3 bottom-3 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-[#CED0D4] bg-white text-[#050505] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition hover:bg-[#F0F2F5] active:scale-[0.97]"
            >
              <Camera className="h-[15px] w-[15px]" strokeWidth={2.25} />
            </button>
          ) : null}
        </div>

        {/* Full-width overlap used to steal clicks — keep events only on the avatar */}
        <div className="pointer-events-none relative z-20 -mt-14 flex justify-center">
          <div className="pointer-events-auto relative">
            <div
              className="flex h-[112px] w-[112px] items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-[#f5f5f4] shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
              style={{ outline: `2px solid ${accent}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.appearance.logoImage || DEFAULT_CARD_AVATAR}
                alt=""
                className="h-full w-full object-cover object-center"
              />
            </div>
            {onUploadProfile ? (
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                aria-label="Change profile picture"
                className="absolute right-0.5 bottom-0.5 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-[#CED0D4] bg-white text-[#050505] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition hover:bg-[#F0F2F5] active:scale-[0.97]"
              >
                <Camera className="h-[15px] w-[15px]" strokeWidth={2.25} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-5 text-center">
        <h1 className="font-dashboard text-xl font-extrabold text-[#0f0f12]">
          {name}
        </h1>
        <p className="mt-1 text-sm text-[#8a8a92]">
          {titleLine || "Hexa NFC Business Card"}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className={ctaClass}
            style={{ backgroundColor: accent }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Save Contact
          </button>
          {hasBrochure ? (
            <button
              type="button"
              onClick={() => void handleBrochureClick()}
              className={ctaClass}
              style={{ backgroundColor: accent }}
            >
              <FileText className="h-3.5 w-3.5" />
              Brochure
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className={ctaClass}
            style={{ backgroundColor: accent }}
          >
            <FaWhatsapp className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        {profile.contact.mobile ? (
          <a
            href={`tel:+${phoneDigitsForLink(profile.contact.countryCode, profile.contact.mobile)}`}
            className={infoCardClass}
            style={{ borderColor: accentMuted }}
          >
            <div className="flex items-center gap-2" style={{ color: accent }}>
              <Phone className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="text-xs text-[#a0a0a8]">Mobile</span>
            </div>
            <p className="mt-1 break-words text-[13px] leading-snug font-semibold text-[#0f0f12]">
              {formatDialNumber(
                profile.contact.countryCode,
                profile.contact.mobile,
              )}
            </p>
          </a>
        ) : null}

        {profile.contact.email ? (
          <a
            href={`mailto:${profile.contact.email.trim()}`}
            className={`${infoCardClass} hover:bg-[#FAFAF8]`}
            style={{ borderColor: accentMuted }}
          >
            <div className="flex items-center gap-2" style={{ color: accent }}>
              <Mail className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="text-xs text-[#a0a0a8]">Email</span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-[#0f0f12]">
              {profile.contact.email}
            </p>
          </a>
        ) : null}

        {profile.contact.website ? (
          <a
            href={websiteHref}
            target="_blank"
            rel="noreferrer"
            className={`${infoCardClass} hover:bg-[#FAFAF8]`}
            style={{ borderColor: accentMuted }}
          >
            <div className="flex items-center gap-2" style={{ color: accent }}>
              <Globe className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="text-xs text-[#a0a0a8]">Website</span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-[#0f0f12]">
              {profile.contact.website}
            </p>
          </a>
        ) : null}

        {profile.contact.whatsapp || profile.contact.mobile ? (
          <a
            href={`https://wa.me/${phoneDigitsForLink(
              profile.contact.countryCode,
              profile.contact.whatsapp || profile.contact.mobile,
            )}`}
            target="_blank"
            rel="noreferrer"
            className={infoCardClass}
            style={{ borderColor: accentMuted }}
          >
            <div className="flex items-center gap-2" style={{ color: accent }}>
              <FaWhatsapp className="h-3.5 w-3.5" />
              <span className="text-xs text-[#a0a0a8]">WhatsApp</span>
            </div>
            <p className="mt-1 break-words text-[13px] leading-snug font-semibold text-[#0f0f12]">
              {formatDialNumber(
                profile.contact.countryCode,
                profile.contact.whatsapp || profile.contact.mobile,
              )}
            </p>
          </a>
        ) : null}

        {fullAddress ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className={`col-span-2 ${infoCardClass} hover:bg-[#FAFAF8]`}
            style={{ borderColor: accentMuted }}
          >
            <div className="flex items-center gap-2" style={{ color: accent }}>
              <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="text-xs text-[#a0a0a8]">Address · Open in Maps</span>
            </div>
            <p className="mt-1 text-sm leading-snug font-semibold text-[#0f0f12]">
              {fullAddress}
            </p>
          </a>
        ) : null}
      </div>

      <CardLayoutBottom
        accent={accent}
        accentMuted={accentMuted}
        about={about}
        services={services}
        socialLinks={socialLinks.map(({ label, Icon, href }) => ({
          label,
          Icon,
          href,
        }))}
      />

      <CardShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        accent={accent}
        cardName={name}
      />
    </div>
  );
}
