"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  IdCard,
  Link2,
  BookOpen,
  CalendarClock,
} from "lucide-react";

const includes = [
  { label: "Contact details", Icon: IdCard },
  { label: "Social media links", Icon: Link2 },
  { label: "Brochures or PDFs", Icon: BookOpen },
  { label: "Meeting links", Icon: CalendarClock },
];

/** Bump when replacing files in public/Images/Layouts. */
const LAYOUT_VERSION = "2026-08-11-1553";

const LAYOUT_IMAGES = [
  { src: `/Images/Layouts/IMG_Untitled-3.png?v=${LAYOUT_VERSION}`, label: "Classic" },
  { src: `/Images/Layouts/IMG_Untitled-4.png?v=${LAYOUT_VERSION}`, label: "Basic" },
  { src: `/Images/Layouts/IMG_Untitled-1.png?v=${LAYOUT_VERSION}`, label: "Modern" },
  // { src: `/Images/Layouts/IMG_Untitled-2.png?v=${LAYOUT_VERSION}`, label: "Compact" },
  // { src: `/Images/Layouts/IMG_Untitled-3.png?v=${LAYOUT_VERSION}`, label: "Modern" },
  { src: `/Images/Layouts/IMG_Untitled-7.png?v=${LAYOUT_VERSION}`, label: "Social" },
  { src: `/Images/Layouts/IMG_Untitled-5.png?v=${LAYOUT_VERSION}`, label: "Compact" },
  { src: `/Images/Layouts/IMG_Untitled-6.png?v=${LAYOUT_VERSION}`, label: "Minimalist" },
 
] as const;

const AUTO_MS = 3000;
const SWIPE_THRESHOLD = 48;

const callouts = [
  { label: "Your Cover Img", top: "14%" },
  { label: "Your Bio", top: "46%" },
  { label: "Your Social icons", top: "78%" },
];

/** Right-side hex nest — different from hero (pointy-top, gold tint, right-anchored) */
function FeatureRightBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 z-0 w-full overflow-hidden sm:w-[58%] lg:w-[52%]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_65%_at_78%_45%,#ffffff_0%,transparent_72%)]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.4]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMaxYMid slice"
      >
        <defs>
          <pattern
            id="featureHexTile"
            width="92"
            height="106"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M46 4 L84 26 L84 70 L46 92 L8 70 L8 26 Z"
              fill="none"
              stroke="#64748b"
              strokeOpacity="0.28"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            <path
              d="M46 4 L84 26 L84 70 L46 92 L8 70 L8 26 Z"
              fill="#BC7C10"
              fillOpacity="0.03"
            />
            <path
              d="M92 57 L130 79 L130 123 L92 145 L54 123 L54 79 Z"
              fill="none"
              stroke="#64748b"
              strokeOpacity="0.18"
              strokeWidth="1"
              strokeLinejoin="round"
              transform="translate(-46 -53)"
            />
          </pattern>

          <linearGradient id="featureHexFadeL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFCF6" stopOpacity="1" />
            <stop offset="28%" stopColor="#FFFCF6" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#FFFCF6" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="featureHexFadeY" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFCF6" stopOpacity="0.9" />
            <stop offset="18%" stopColor="#FFFCF6" stopOpacity="0" />
            <stop offset="82%" stopColor="#FFFCF6" stopOpacity="0" />
            <stop offset="100%" stopColor="#FFFCF6" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#featureHexTile)" />
        <rect width="100%" height="100%" fill="url(#featureHexFadeL)" />
        <rect width="100%" height="100%" fill="url(#featureHexFadeY)" />
      </svg>
    </div>
  );
}

function LayoutPhoneCarousel() {
  const count = LAYOUT_IMAGES.length;
  // Track: [clone of last, ...layouts, clone of first] for seamless looping
  const track = [
    LAYOUT_IMAGES[count - 1],
    ...LAYOUT_IMAGES,
    LAYOUT_IMAGES[0],
  ] as const;
  const FIRST_REAL = 1;
  const LAST_REAL = count;
  const CLONE_FIRST = count + 1;

  const [trackIndex, setTrackIndex] = useState(FIRST_REAL);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<"x" | "y" | null>(null);
  const trackIndexRef = useRef(trackIndex);
  trackIndexRef.current = trackIndex;

  const realIndex = (() => {
    if (trackIndex <= 0) return count - 1;
    if (trackIndex >= CLONE_FIRST) return 0;
    return Math.max(0, Math.min(count - 1, trackIndex - 1));
  })();
  const currentLayout = LAYOUT_IMAGES[realIndex] ?? LAYOUT_IMAGES[0];

  const jumpTo = useCallback((nextTrackIndex: number) => {
    setAnimate(true);
    setTrackIndex(nextTrackIndex);
    setDragX(0);
  }, []);

  const goToReal = useCallback(
    (real: number) => {
      const safe = ((real % count) + count) % count;
      jumpTo(FIRST_REAL + safe);
    },
    [count, jumpTo],
  );

  const goNext = useCallback(() => {
    setAnimate(true);
    setTrackIndex((i) => {
      if (i >= CLONE_FIRST) return FIRST_REAL + 1;
      return Math.min(i + 1, CLONE_FIRST);
    });
    setDragX(0);
  }, [CLONE_FIRST, FIRST_REAL]);

  const goPrev = useCallback(() => {
    setAnimate(true);
    setTrackIndex((i) => {
      if (i <= 0) return LAST_REAL - 1;
      return Math.max(i - 1, 0);
    });
    setDragX(0);
  }, [LAST_REAL]);

  useEffect(() => {
    if (paused || dragging) return;
    const id = window.setInterval(() => {
      setAnimate(true);
      setTrackIndex((i) => {
        if (i >= CLONE_FIRST) return FIRST_REAL + 1;
        return Math.min(i + 1, CLONE_FIRST);
      });
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, dragging, CLONE_FIRST, FIRST_REAL]);

  function onTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (trackIndexRef.current === CLONE_FIRST) {
      setAnimate(false);
      setTrackIndex(FIRST_REAL);
    } else if (trackIndexRef.current === 0) {
      setAnimate(false);
      setTrackIndex(LAST_REAL);
    }
  }

  // Re-enable animation after silent snap
  useEffect(() => {
    if (animate) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAnimate(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [animate, trackIndex]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    startY.current = e.clientY;
    locked.current = null;
    setDragging(true);
    setPaused(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!locked.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      locked.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (locked.current !== "x") return;

    e.preventDefault();
    setDragX(dx);
  }

  function onPointerUp() {
    if (!dragging) return;
    if (locked.current === "x") {
      if (dragX <= -SWIPE_THRESHOLD) goNext();
      else if (dragX >= SWIPE_THRESHOLD) goPrev();
      else setDragX(0);
    } else {
      setDragX(0);
    }
    setDragging(false);
    locked.current = null;
    setPaused(false);
  }

  const offsetPct = (dragX / 320) * 100;

  return (
    <div className="relative w-[290px] shrink-0 sm:w-[320px] lg:w-[340px]">
      <div
        className="relative touch-pan-y select-none overflow-hidden bg-transparent"
        style={{ aspectRatio: "9 / 16" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          if (!dragging) setPaused(false);
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label="Card layout previews"
      >
        <div
          className="flex h-full w-full"
          onTransitionEnd={onTransitionEnd}
          style={{
            transform: `translateX(calc(${-trackIndex * 100}% + ${offsetPct}%))`,
            transition:
              dragging || !animate
                ? "none"
                : "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {track.map((layout, i) => (
            <div
              key={`${layout.src}-${i}`}
              className="relative h-full w-full shrink-0"
              aria-hidden={i !== trackIndex}
            >
              <Image
                src={layout.src}
                alt={`${layout.label} card layout`}
                fill
                unoptimized
                draggable={false}
                className="pointer-events-none object-contain object-center"
                sizes="(max-width: 640px) 290px, (max-width: 1024px) 320px, 340px"
                priority={i === FIRST_REAL}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-2.5">
        <p className="text-xs font-semibold tracking-wide text-[#5c5346]">
          <span className="text-[#BC7C10]">{currentLayout.label}</span>
          <span className="mx-1.5 text-[#c4bbb0]">·</span>
          Layout {realIndex + 1} of {count}
        </p>
        <div
          className="flex items-center gap-1.5"
          role="tablist"
          aria-label="Card layouts"
        >
          {LAYOUT_IMAGES.map((layout, i) => (
            <button
              key={layout.src}
              type="button"
              role="tab"
              aria-selected={i === realIndex}
              aria-label={`Show ${layout.label} layout`}
              onClick={() => goToReal(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === realIndex
                  ? "w-6 bg-[#BC7C10]"
                  : "w-1.5 bg-[#d6cfc4] hover:bg-[#BC7C10]/50"
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-[#a0988c]">Swipe to explore layouts</p>
      </div>
    </div>
  );
}

export default function Feature() {
  return (
    <section
      id="features"
      className="relative scroll-mt-20 overflow-hidden bg-[#FFFCF6] py-16 sm:py-24"
    >
      <FeatureRightBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-10 xl:gap-16">
          <div className="max-w-xl">
            <h2 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-[#0f0f12] sm:text-4xl lg:text-5xl">
              Your First Impression, Unique and Smart-Always
            </h2>

            <p className="mt-5 text-base leading-relaxed text-[#4a4a52] sm:text-lg">
              Create your digital profile in minutes and share it with anyone,
              anywhere — seamlessly and efficiently.
            </p>

            <p className="mt-4 text-base leading-relaxed text-[#4a4a52] sm:text-lg">
              With Hexa Cards, you can share all your details instantly and
              update them in real time. Whether it&apos;s for business,
              networking, or personal branding, your profile is always up to
              date and ready to impress.
            </p>

            <p className="mt-6 text-base font-semibold text-[#0f0f12] sm:text-lg">
              Share anything you need, including:
            </p>

            <ul className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
              {includes.map(({ label, Icon }) => (
                <li key={label} className="flex items-center gap-3">
                  <Icon
                    className="h-5 w-5 shrink-0 text-[#1a1a1a]"
                    strokeWidth={1.75}
                  />
                  <span className="text-sm font-semibold text-[#0f0f12] sm:text-base">
                    {label}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="#products"
              className="mt-8 inline-flex rounded-full bg-[#BC7C10] px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-black/10 transition-transform active:scale-[0.98] sm:px-8 sm:py-4 sm:text-base"
            >
              Get Your Hexa Card
            </a>
          </div>

          <div className="flex flex-col items-center gap-6 lg:items-end">
            <div className="relative flex items-start">
              <LayoutPhoneCarousel />

              <div
                className="relative ml-1 hidden h-[600px] w-[160px] shrink-0 lg:block xl:ml-2 xl:w-[200px]"
                aria-hidden
              >
                {callouts.map(({ label, top }) => (
                  <div
                    key={label}
                    className="absolute left-0 flex items-center"
                    style={{ top }}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#1a1a1a] bg-white" />
                    <span className="h-px w-10 shrink-0 bg-[#1a1a1a] xl:w-14" />
                    <span className="ml-2 text-base leading-tight font-bold whitespace-nowrap text-[#0f0f12] xl:text-xl">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <ul className="flex flex-wrap justify-center gap-2 lg:hidden">
              {callouts.map(({ label }) => (
                <li
                  key={label}
                  className="rounded-full border border-black/10 bg-[#f7f7f8] px-3 py-1.5 text-xs font-semibold text-[#0f0f12]"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
