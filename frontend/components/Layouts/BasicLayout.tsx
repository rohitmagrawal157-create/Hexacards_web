"use client";

import { Camera } from "lucide-react";
import {
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
} from "@/lib/card-profile";

export type BasicHeaderProps = {
  name: string;
  titleLine?: string;
  coverUrl?: string | null;
  avatarUrl?: string | null;
  accent?: string;
  /** Compact thumbnail for Appearance picker */
  preview?: boolean;
  onChangeBackground?: () => void;
  onChangeProfile?: () => void;
};

/**
 * Basic card header — cover with centered overlapping avatar, then name/title.
 */
export default function BasicLayout({
  name,
  titleLine = "Hexa NFC Business Card",
  coverUrl,
  avatarUrl,
  accent = "#BC7C10",
  preview = false,
  onChangeBackground,
  onChangeProfile,
}: BasicHeaderProps) {
  const cover = coverUrl || DEFAULT_CARD_BANNER;
  const avatar = avatarUrl || DEFAULT_CARD_AVATAR;
  const coverH = preview ? "h-24" : "h-52 sm:h-60";
  const avatarSize = preview ? "h-14 w-14" : "h-[112px] w-[112px]";
  const overlap = preview ? "-mt-7" : "-mt-14";

  return (
    <div className={preview ? "pointer-events-none select-none" : ""}>
      <div className="relative">
        <div
          className={`relative w-full overflow-hidden bg-[#d8dde3] ${coverH} ${
            onChangeBackground ? "cursor-pointer" : ""
          }`}
          style={{
            backgroundImage: `url("${cover.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`,
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
              className="absolute right-3 bottom-3 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-[#CED0D4] bg-white text-[#050505] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition hover:bg-[#F0F2F5] active:scale-[0.97]"
            >
              <Camera className="h-[15px] w-[15px]" strokeWidth={2.25} />
            </button>
          ) : null}
        </div>

        <div
          className={`pointer-events-none relative z-20 ${overlap} flex justify-center`}
        >
          <div className="pointer-events-auto relative">
            <div
              className={`flex items-center justify-center overflow-hidden rounded-full border-white bg-[#f5f5f4] shadow-[0_8px_24px_rgba(0,0,0,0.16)] ${avatarSize} ${
                preview ? "border-[3px]" : "border-[5px]"
              }`}
              style={{ outline: `2px solid ${accent}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt=""
                className="h-full w-full object-cover object-center"
              />
            </div>
            {onChangeProfile ? (
              <button
                type="button"
                onClick={onChangeProfile}
                aria-label="Change profile picture"
                className="absolute right-0.5 bottom-0.5 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-[#CED0D4] bg-white text-[#050505] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition hover:bg-[#F0F2F5] active:scale-[0.97]"
              >
                <Camera className="h-[15px] w-[15px]" strokeWidth={2.25} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`px-4 text-center ${preview ? "pt-1.5 pb-2" : "px-5 pt-3 pb-1"}`}
      >
        <h1
          className={`font-dashboard font-extrabold text-[#0f0f12] ${
            preview ? "truncate text-xs" : "text-xl sm:text-2xl"
          }`}
        >
          {name || "Your Name"}
        </h1>
        <p
          className={`text-[#8a8a92] ${
            preview ? "mt-0.5 truncate text-[9px]" : "mt-1 text-sm"
          }`}
        >
          {titleLine || "Hexa NFC Business Card"}
        </p>
      </div>
    </div>
  );
}
