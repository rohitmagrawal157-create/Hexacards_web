"use client";

import {
  Phone,
  Mail,
  Globe,
  MapPin,
  ChevronDown,
  Share2,
  UserPlus,
  MessageCircle,
  FileText,
  Camera,
} from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
  FaYoutube,
  FaGoogle,
  FaWhatsapp,
} from "react-icons/fa";
import {
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
} from "@/lib/card-profile";

type LayoutPhonePreviewProps = {
  layoutId: "classic" | "basic" | "modern" | "compact" | "social" | "minimalist" | string;
  name: string;
  titleLine: string;
  coverUrl?: string | null;
  avatarUrl?: string | null;
  accent?: string;
  mobile?: string;
  email?: string;
};

function escUrl(url: string) {
  return url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Compact, screen-filling mini of Classic / Basic / Modern for the Appearance phone frame.
 */
export default function LayoutPhonePreview({
  layoutId,
  name,
  titleLine,
  coverUrl,
  avatarUrl,
  accent = "#BC7C10",
  mobile,
  email,
}: LayoutPhonePreviewProps) {
  const cover = coverUrl || DEFAULT_CARD_BANNER;
  const avatar = avatarUrl || DEFAULT_CARD_AVATAR;
  const borderSoft = `${accent}33`;
  const mobileLabel = mobile?.trim() || "+91 ·····";
  const emailLabel = email?.trim() || "you@email.com";

  const contactCards = (
    <div className="grid grid-cols-2 gap-1 px-1.5 pb-1.5">
      <div
        className="rounded-md border bg-white px-1.5 py-1.5"
        style={{ borderColor: borderSoft }}
      >
        <p className="text-[7px]" style={{ color: accent }}>
          Mobile
        </p>
        <p className="mt-0.5 truncate text-[8px] font-semibold text-[#0f0f12]">
          {mobileLabel}
        </p>
      </div>
      <div
        className="rounded-md border bg-white px-1.5 py-1.5"
        style={{ borderColor: borderSoft }}
      >
        <p className="text-[7px]" style={{ color: accent }}>
          Email
        </p>
        <p className="mt-0.5 truncate text-[8px] font-semibold text-[#0f0f12]">
          {emailLabel}
        </p>
      </div>
      <div
        className="col-span-2 rounded-md border bg-white px-1.5 py-1.5"
        style={{ borderColor: borderSoft }}
      >
        <p className="text-[7px]" style={{ color: accent }}>
          Address
        </p>
        <p className="mt-0.5 truncate text-[8px] font-semibold text-[#0f0f12]">
          City · Open in Maps
        </p>
      </div>
    </div>
  );

  const businessBar = (
    <div
      className="mx-1.5 mb-1.5 flex items-center justify-between rounded-lg px-2 py-1.5 text-white"
      style={{ backgroundColor: accent }}
    >
      <span className="text-[8px] font-semibold">Business Information</span>
      <ChevronDown className="h-3 w-3 opacity-90" strokeWidth={2.5} />
    </div>
  );

  if (layoutId === "social") {
    const contactIcons = [
      { label: "Call", src: "/icons/Hexacards_Icons-15.png" },
      { label: "WhatsApp", src: "/icons/Hexacards_Icons-06.png" },
      { label: "Email", src: "/icons/Hexacards_Icons-11.png" },
      { label: "Website", src: "/icons/Hexacards_Icons-08.png" },
      { label: "Location", src: "/icons/Hexacards_Icons-13.png" },
      { label: "Brochure", src: "/icons/Hexacards_Icons-16.png" },
    ];
    const socialIcons = [
      { label: "Facebook", src: "/icons/Hexacards_Icons-01.png" },
      { label: "Instagram", src: "/icons/Hexacards_Icons-02.png" },
      { label: "LinkedIn", src: "/icons/Hexacards_Icons-03.png" },
      { label: "YouTube", src: "/icons/Hexacards_Icons-04.png" },
      { label: "Google", src: "/icons/Hexacards_Icons-09.png" },
      { label: "X", src: "/icons/Hexacards_Icons-12.png" },
    ];

    return (
      <div className="flex h-full flex-col overflow-hidden bg-[#FAFAF8]">
        {/* WhatsApp share bar — matches live Social */}
        <div className="relative z-40 flex shrink-0 items-center gap-1 border-b border-black/[0.06] bg-white px-1.5 py-1">
          <span className="min-w-0 flex-1 truncate text-[7px] text-[#a0a0a8]">
            Enter WhatsApp Number
          </span>
          <span
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[7px] font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            <FaWhatsapp className="h-2 w-2" />
            Share
          </span>
        </div>

        {/* Cover banner */}
        <div className="relative shrink-0">
          <div
            className="h-[96px] w-full bg-cover bg-center"
            style={{ backgroundImage: `url("${escUrl(cover)}")` }}
          >
            <span className="absolute top-1.5 right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#141414] shadow-sm">
              <Camera className="h-2 w-2" strokeWidth={2.5} />
            </span>
          </div>

          {/* Avatar on cover/card seam + profile camera */}
          <div className="absolute bottom-0 left-1/2 z-30 -translate-x-1/2 translate-y-[42%]">
            <div className="relative">
              <div
                className="h-[52px] w-[52px] overflow-hidden rounded-full border-[2.5px] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                style={{ borderColor: accent }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="absolute right-0 bottom-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/80 bg-white text-[#141414] shadow-sm">
                <Camera className="h-1.5 w-1.5" strokeWidth={2.5} />
              </span>
            </div>
          </div>
        </div>

        {/* Identity card */}
        <div
          className="relative z-20 mx-2 mt-7 rounded-2xl border bg-white px-2.5 pt-2.5 pb-2.5 shadow-sm"
          style={{ borderColor: `${accent}33` }}
        >
          <p className="truncate text-center text-[9px] font-extrabold text-[#141414]">
            {name}
          </p>
          <p className="mt-0.5 line-clamp-1 text-center text-[6px] font-medium text-[#6b6560]">
            {titleLine || "Hexa NFC Business Card"}
          </p>
          <p className="mt-1 line-clamp-2 text-center text-[5.5px] leading-snug text-[#8a8a92]">
            Create your digital profile and share contacts, links, and leads in
            one tap.
          </p>
          <p
            className="mt-1 flex items-center justify-center gap-0.5 text-center text-[5.5px] font-bold"
            style={{ color: accent }}
          >
            View more
            <ChevronDown className="h-2 w-2" strokeWidth={2.5} />
          </p>
          <div className="mt-2 flex items-center gap-1">
            <span
              className="flex-1 rounded-full py-1.5 text-center text-[6px] font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              Save Contact
            </span>
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full border bg-white"
              style={{ borderColor: `${accent}55`, color: accent }}
            >
              <Share2 className="h-2.5 w-2.5" strokeWidth={2.5} />
            </span>
          </div>
        </div>

        {/* Contact Information */}
        <div
          className="mx-2 mt-2 rounded-xl border bg-[#FAFAF8] p-1.5"
          style={{ borderColor: `${accent}33` }}
        >
          <p className="text-center text-[7px] font-extrabold text-[#141414]">
            Contact Information
          </p>
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            {contactIcons.map(({ label, src }) => (
              <span
                key={label}
                className="flex min-w-0 flex-col items-center gap-0.5"
              >
                <span className="relative h-7 w-7 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full scale-[1.28] object-cover"
                  />
                </span>
                <span className="w-full truncate text-center text-[4.5px] font-medium text-[#6a6a72]">
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Social Media */}
        <div
          className="mx-2 mt-1.5 rounded-xl border bg-[#FAFAF8] p-1.5"
          style={{ borderColor: `${accent}33` }}
        >
          <p className="text-center text-[7px] font-extrabold text-[#141414]">
            Social Media
          </p>
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            {socialIcons.map(({ label, src }) => (
              <span
                key={label}
                className="flex min-w-0 flex-col items-center gap-0.5"
              >
                <span className="relative h-7 w-7 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full scale-[1.28] object-cover"
                  />
                </span>
                <span className="w-full truncate text-center text-[4.5px] font-medium text-[#6a6a72]">
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div
          className="mx-2 mt-1.5 rounded-xl border bg-white px-1.5 py-1.5"
          style={{ borderColor: `${accent}33` }}
        >
          <p className="text-[7px] font-semibold text-[#141414]">Contact Form</p>
          <div className="mt-1 space-y-0.5">
            <span className="block h-1.5 rounded-sm bg-black/[0.06]" />
            <span className="block h-1.5 w-3/4 rounded-sm bg-black/[0.06]" />
            <span
              className="mt-1 block h-2 w-full rounded-sm"
              style={{ backgroundColor: accent }}
            />
          </div>
        </div>

        <div
          className="mt-auto border-t bg-[#f7f7f5] px-2 py-1.5 text-center"
          style={{ borderColor: `${accent}55` }}
        >
          <p
            className="text-[7px] font-extrabold tracking-wide"
            style={{ color: accent }}
          >
            HEXA CARDS
          </p>
          <p className="mt-0.5 text-[5px] font-semibold text-[#8a8a92]">
            Create Your Own NFC Card
          </p>
        </div>
      </div>
    );
  }

  if (layoutId === "compact") {
    const topIcons = [Phone, MessageCircle, Globe, UserPlus, Share2];
    const compactRows = [
      { label: "Mobile", value: mobileLabel, Icon: Phone },
      { label: "Email", value: emailLabel, Icon: Mail },
      { label: "Website", value: "yoursite.com", Icon: Globe },
      { label: "Address", value: "City · Maps", Icon: MapPin },
    ] as const;

    return (
      <div className="flex h-full flex-col bg-[#F3F5FA]">
        <div className="flex items-center gap-1 border-b border-black/[0.06] bg-white px-1.5 py-1">
          <span className="min-w-0 flex-1 truncate text-[7px] text-[#a0a0a8]">
            Enter WhatsApp Number
          </span>
          <span className="rounded bg-[#25D366] px-1.5 py-0.5 text-[7px] font-bold text-white">
            Share
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div
            className="relative flex h-[90px] w-full shrink-0 items-center justify-center bg-cover bg-center"
            style={{ backgroundImage: `url("${escUrl(cover)}")` }}
          >
            <div className="h-11 w-11 overflow-hidden rounded-full border-[3px] border-white bg-[#f5f5f4] shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="mt-1.5 px-1.5 text-center">
            <p className="max-w-full truncate text-[10px] font-extrabold text-[#0f0f12]">
              {name}
            </p>
            <p className="mt-0.5 line-clamp-1 max-w-full text-[7px] text-[#8a8a92]">
              {titleLine}
            </p>
          </div>

          <div className="mt-2 flex justify-center gap-1.5 px-1.5">
            {topIcons.map((Icon, i) => (
              <span
                key={i}
                className="flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm"
                style={{ backgroundColor: accent }}
              >
                <Icon className="h-[10px] w-[10px]" strokeWidth={2.5} />
              </span>
            ))}
          </div>

          <div className="mx-1.5 mt-2 flex gap-0.5 rounded-md bg-black/[0.04] p-0.5">
            {["Contact", "Socials", "Message"].map((label, i) => (
              <span
                key={label}
                className={`flex-1 rounded py-1.5 text-center text-[7px] font-bold ${
                  i === 0 ? "text-white" : "text-[#8a8a92]"
                }`}
                style={i === 0 ? { backgroundColor: accent } : undefined}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-1.5 flex min-h-0 flex-1 flex-col gap-1 px-1.5 pb-1.5">
            {compactRows.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-md border border-black/[0.06] bg-white px-1.5 py-1.5"
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px]"
                  style={{ backgroundColor: `${accent}18`, color: accent }}
                >
                  <Icon className="h-[11px] w-[11px]" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[6px] leading-none text-[#8a8a92]">{label}</p>
                  <p className="mt-0.5 truncate text-[8px] font-semibold text-[#0f0f12]">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 px-1.5 pb-1.5 pt-1">
          <div
            className="flex items-center justify-between rounded-md px-2 py-1.5 text-white"
            style={{ backgroundColor: accent }}
          >
            <span className="text-[8px] font-semibold">Business Information</span>
            <ChevronDown className="h-3 w-3 opacity-90" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    );
  }

  if (layoutId === "modern") {
    const modernRows = [
      { label: "Mobile", value: mobileLabel, Icon: Phone },
      { label: "Email", value: emailLabel, Icon: Mail },
      { label: "Website", value: "yoursite.com", Icon: Globe },
    ] as const;

    const topIcons = [Phone, MessageCircle, Globe, UserPlus, Share2];

    return (
      <div className="flex h-full flex-col bg-[#F3F5FA]">
        <div className="flex items-center gap-1 border-b border-black/[0.06] bg-white px-1.5 py-1">
          <span className="min-w-0 flex-1 truncate text-[7px] text-[#a0a0a8]">
            Enter WhatsApp Number
          </span>
          <span className="rounded bg-[#25D366] px-1.5 py-0.5 text-[7px] font-bold text-white">
            Share
          </span>
        </div>

        <div className="bg-white pb-1.5">
          {/* Banner with profile centered inside */}
          <div
            className="relative flex h-[90px] w-full items-center justify-center bg-cover bg-center"
            style={{ backgroundImage: `url("${escUrl(cover)}")` }}
          >
            <div className="h-12 w-12 overflow-hidden rounded-full border-[3px] border-white bg-[#f5f5f4] shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="mt-1.5 px-1.5 text-center">
            <p className="max-w-full truncate text-[9px] font-extrabold text-[#0f0f12]">
              {name}
            </p>
            <p className="mt-0.5 line-clamp-1 max-w-full text-[6px] text-[#8a8a92]">
              {titleLine}
            </p>
          </div>

          {/* Top quick actions — solid circles with visible white icons */}
          <div className="mt-1.5 flex justify-center gap-1 px-1.5">
            {topIcons.map((Icon, i) => (
              <span
                key={i}
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-white shadow-sm"
                style={{ backgroundColor: accent }}
              >
                <Icon className="h-[9px] w-[9px]" strokeWidth={2.5} />
              </span>
            ))}
          </div>

          {/* Bottom rows — soft tinted icons (different from top) */}
          <div className="mt-1.5 space-y-1 px-1.5">
            {modernRows.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-md border border-black/[0.06] bg-white px-1.5 py-1"
              >
                <span
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px]"
                  style={{ backgroundColor: `${accent}18`, color: accent }}
                >
                  <Icon className="h-[10px] w-[10px]" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[6px] leading-none text-[#8a8a92]">{label}</p>
                  <p className="mt-0.5 truncate text-[7px] font-semibold text-[#0f0f12]">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto px-1.5 pb-1.5 pt-1">
          <div
            className="flex items-center justify-between rounded-md px-2 py-1.5 text-white"
            style={{ backgroundColor: accent }}
          >
            <span className="text-[8px] font-semibold">Business Information</span>
            <ChevronDown className="h-3 w-3 opacity-90" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    );
  }

  if (layoutId === "basic") {
    const basicTop = [Phone, MessageCircle, MapPin, Globe, UserPlus, Share2];

    return (
      <div className="flex h-full flex-col bg-[#F4F5F7]">
        <div className="flex items-center gap-1 border-b border-black/[0.06] bg-white px-1.5 py-1">
          <span className="min-w-0 flex-1 truncate text-[7px] text-[#a0a0a8]">
            Enter WhatsApp Number
          </span>
          <span className="rounded bg-[#25D366] px-1.5 py-0.5 text-[7px] font-bold text-white">
            Share
          </span>
        </div>

        <div
          className="h-[90px] w-full shrink-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${escUrl(cover)}")` }}
        />
        <div className="relative z-10 -mt-6 flex flex-col items-center px-1.5 text-center">
          <div
            className="h-12 w-12 overflow-hidden rounded-full border-[2.5px] border-white bg-[#f5f5f4] shadow"
            style={{ outline: `1.5px solid ${accent}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          </div>
          <p className="mt-1.5 max-w-full truncate text-[10px] font-extrabold text-[#0f0f12]">
            {name}
          </p>
          <p className="mt-0.5 line-clamp-1 max-w-full text-[7px] text-[#8a8a92]">
            {titleLine}
          </p>
        </div>

        <div className="mt-2 flex justify-center gap-1 px-1.5">
          {basicTop.map((Icon, i) => (
            <span
              key={i}
              className="flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm"
              style={{ backgroundColor: accent }}
            >
              <Icon className="h-[10px] w-[10px]" strokeWidth={2.5} />
            </span>
          ))}
        </div>

        <div className="mt-2 flex min-h-0 flex-1 flex-col justify-between">
          {contactCards}
          {businessBar}
        </div>
      </div>
    );
  }

  // Minimalist — mirrors live card layout
  if (layoutId === "minimalist") {
    const miniIcons = [Phone, Mail, Globe, FaWhatsapp, MapPin];

    return (
      <div className="flex h-full flex-col overflow-hidden bg-white">
        {/* Banner — camera on cover; share outside below */}
        <div className="relative shrink-0">
          <div
            className="relative h-[90px] w-full bg-cover bg-center"
            style={{ backgroundImage: `url("${escUrl(cover)}")` }}
          >
            <span className="absolute right-1.5 bottom-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-[#CED0D4] bg-white text-[#050505] shadow-md ring-1 ring-black/5">
              <Camera className="h-2 w-2" strokeWidth={2.5} />
            </span>
          </div>
          <span
            className="absolute right-1.5 top-full z-20 mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#CED0D4] bg-white shadow-md ring-1 ring-black/5"
            style={{ color: accent }}
          >
            <Share2 className="h-2 w-2" strokeWidth={2.5} />
          </span>
        </div>

        {/* Avatar + name — left aligned */}
        <div className="relative z-10 -mt-6 px-2.5 pr-7">
          <div className="h-12 w-12 overflow-hidden rounded-full border-[2.5px] border-white bg-[#f5f5f4] shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="px-2.5 pt-1.5 text-left">
          <p className="truncate text-[9px] font-extrabold text-[#0f0f12]">
            {name}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[6px] text-[#8a8a92]">
            {titleLine}
          </p>
        </div>

        {/* Quick-action circles — same elevated look as Share */}
        <div className="mt-2 flex justify-center gap-1 px-2">
          {miniIcons.map((Icon, i) => (
            <span
              key={i}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-[#CED0D4] bg-white shadow-md ring-1 ring-black/5"
              style={{ color: accent }}
            >
              <Icon className="h-[10px] w-[10px]" strokeWidth={2.5} />
            </span>
          ))}
        </div>

        {/* Save Contact · Brochure */}
        <div className="mt-2 flex items-center gap-1 px-2">
          <span
            className="min-w-0 flex-1 rounded-full py-1 text-center text-[5px] font-bold tracking-wide text-white uppercase shadow-sm"
            style={{ backgroundColor: accent }}
          >
            Save Contact
          </span>
          <span
            className="flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full py-1 text-center text-[5px] font-bold tracking-wide text-white uppercase shadow-sm"
            style={{ backgroundColor: accent }}
          >
            <FileText className="h-2 w-2 shrink-0" />
            Brochure
          </span>
        </div>

        {/* Social row */}
        <div className="mt-1.5 flex justify-center gap-1 px-2">
          {[FaFacebookF, FaLinkedinIn, FaInstagram, FaGoogle].map((Icon, i) => (
            <span
              key={i}
              className="flex h-4 w-4 items-center justify-center rounded-full text-white shadow-sm"
              style={{ backgroundColor: accent }}
            >
              <Icon className="h-2 w-2" />
            </span>
          ))}
        </div>

        {/* CTA bars — Business Information + Contact Form only */}
        <div className="mt-2 space-y-1 px-2">
          {["Business Information", "Contact Form"].map((label) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-md px-1.5 py-1 text-white"
              style={{ backgroundColor: accent }}
            >
              <span className="text-[6px] font-semibold">{label}</span>
              <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
            </div>
          ))}
        </div>

        <div className="mt-auto shrink-0 bg-[#f7f7f5] px-2 py-1.5">
          <p
            className="text-center text-[5px] font-semibold"
            style={{ color: accent }}
          >
            Hexa Cards
          </p>
        </div>
      </div>
    );
  }

  // Classic (default)
  return (
    <div className="flex h-full flex-col bg-white">
      <div
        className="h-[90px] w-full shrink-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${escUrl(cover)}")` }}
      />
      <div className="relative z-10 -mt-7 flex flex-col items-center px-1.5 text-center">
        <div
          className="h-14 w-14 overflow-hidden rounded-full border-[3px] border-white bg-[#f5f5f4] shadow"
          style={{ outline: `1.5px solid ${accent}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        </div>
        <p className="mt-1.5 max-w-full truncate text-[10px] font-extrabold text-[#0f0f12]">
          {name}
        </p>
        <p className="mt-0.5 line-clamp-1 max-w-full text-[7px] text-[#8a8a92]">
          {titleLine}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
          <span
            className="rounded-full px-2 py-0.5 text-[7px] font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Save Contact
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[7px] font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Share
          </span>
        </div>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col justify-between">
        {contactCards}
        {businessBar}
      </div>
    </div>
  );
}
