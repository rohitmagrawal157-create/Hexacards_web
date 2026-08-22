"use client";

import type { ReactNode } from "react";

type PhoneFrameProps = {
  /** Layout preview content rendered inside the screen */
  children: ReactNode;
  /** Currently selected layout — adds dark ring, disables click */
  active?: boolean;
  /** Coming-soon layout — faded + “Soon” overlay, not clickable */
  locked?: boolean;
  /** Name under the phone (e.g. Classic, Basic) */
  label?: string;
  /** Optional pill under the phone (e.g. Active / Soon) */
  badge?: string;
  /** Called when user taps a non-active, non-locked phone */
  onClick?: () => void;
  /** Extra classes on the outer wrapper */
  className?: string;
};

/**
 * Slim iPhone-style device chrome for layout previews in Appearance.
 *
 * Visual / size parameters (CSS):
 * - Outer width:     max-w-[158px]
 * - Bezel thickness: p-[3px]
 * - Bezel color:     #111113
 * - Corner radius:   rounded-[1.65rem] (outer) / rounded-[1.45rem] (screen)
 * - Screen height:   h-[320px]
 * - Dynamic Island:  58×14px, centered top
 * - Side buttons:    mute + volume (left), power (right) — decorative only
 * - Active ring:     ring-1 ring-[#141414] ring-offset-2
 * - Hover ring:      ring-[#BC7C10]/50 (when interactive)
 */
export default function PhoneFrame({
  children,
  active = false,
  locked = false,
  label,
  badge,
  onClick,
  className = "",
}: PhoneFrameProps) {
  const interactive = Boolean(onClick) && !locked && !active;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={interactive ? onClick : undefined}
        disabled={!interactive}
        aria-pressed={active}
        aria-label={label ? `Select ${label} layout` : "Layout preview"}
        className={`group relative mx-auto w-full max-w-[158px] text-left transition ${
          interactive ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"
        } ${locked ? "opacity-55" : ""}`}
      >
        {/* Thin outer bezel */}
        <div
          className={`relative rounded-[1.65rem] bg-[#111113] p-[3px] shadow-[0_8px_28px_rgba(0,0,0,0.14)] ring-1 ring-offset-2 transition ${
            active
              ? "ring-[#141414]"
              : interactive
                ? "ring-transparent group-hover:ring-[#BC7C10]/45"
                : "ring-transparent"
          }`}
        >
          {/* Side buttons (visual only) */}
          <span className="pointer-events-none absolute top-[64px] -left-[1.5px] h-5 w-[2px] rounded-l-[1px] bg-[#2a2a2c]" />
          <span className="pointer-events-none absolute top-[92px] -left-[1.5px] h-9 w-[2px] rounded-l-[1px] bg-[#2a2a2c]" />
          <span className="pointer-events-none absolute top-[136px] -left-[1.5px] h-9 w-[2px] rounded-l-[1px] bg-[#2a2a2c]" />
          <span className="pointer-events-none absolute top-[108px] -right-[1.5px] h-12 w-[2px] rounded-r-[1px] bg-[#2a2a2c]" />

          {/* Screen */}
          <div className="relative overflow-hidden rounded-[1.45rem] bg-white">
            {/* Dynamic Island */}
            <div className="absolute top-1.5 left-1/2 z-20 h-[14px] w-[58px] -translate-x-1/2 rounded-full bg-[#0a0a0a]">
              <span className="absolute top-1/2 right-2.5 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#1a3a5c]" />
            </div>

            {/* Screen content */}
            <div className="pointer-events-none h-[320px] overflow-hidden bg-white select-none">
              {children}
            </div>

            {locked ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
                <span className="rounded-full bg-[#141414] px-3 py-1 text-[10px] font-bold tracking-wide text-white uppercase">
                  Soon
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </button>

      {(label || badge) && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {label ? (
            <p className="text-[13px] font-bold text-[#141414]">{label}</p>
          ) : null}
          {badge ? (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                badge.toLowerCase() === "active"
                  ? "bg-[#BC7C10]/12 text-[#9a650d]"
                  : "bg-black/[0.05] text-[#8a8174]"
              }`}
            >
              {badge}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
