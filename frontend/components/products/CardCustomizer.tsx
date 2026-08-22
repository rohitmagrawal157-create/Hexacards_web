"use client";

import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload,
  Wifi,
  Check,
  ImageIcon,
  Palette,
  Type,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import {
  METAL_MODES,
  getMetalPreset,
  type CardMode,
  type MetalMode,
} from "./cardFinishes";
import { GOLD_GRADIENT, GOLD_SOLID, GOLD_STOPS } from "./goldCard";
import { SILVER_GRADIENT } from "./silverCard";
import { goToCheckout } from "@/lib/auth";
import { logoForCardFinish } from "@/lib/order-card";
import { buildStyledQrSvg } from "@/lib/styled-qr";

type Side = "front" | "back";

type LogoLayout = {
  size: number;
  x: number;
  y: number;
};

type CardBody = "black" | "white";

const CARD_BODY = {
  black: "#141414",
  white: "#FFFFFF",
} as const;

/** White card accents — gold matches black-card gold; order: gold, black, red, green, orange… */
const whiteCardAccents = [
  { label: "Gold", color: GOLD_SOLID },
  { label: "Black", color: "#141414" },
  { label: "Red", color: "#E53935" },
  { label: "Green", color: "#00B813" },
  { label: "Orange", color: "#FF8E00" },
  { label: "Dark Pink", color: "#C2185B" },
  { label: "Royal Blue", color: "#1565C0" },
  { label: "Light Green", color: "#7CB342" },
  { label: "Yellow", color: "#FDD835" },
  { label: "Sky Blue", color: "#00BFFF" },
  { label: "Hot Pink", color: "#FD0095" },
] as const;

const CARD_W = 244;
const CARD_H = 154;
/** Screen preview is scaled up from the real 244×154 design canvas */
const PREVIEW_MAX_W = 488; // 2× for comfortable editing

const FRONT_LOGO_DEFAULT: LogoLayout = { size: 40, x: 6, y: 8 };
const BACK_LOGO_DEFAULT: LogoLayout = { size: 200, x: 50, y: 50 };

const SIZE_MIN = 48;
const SIZE_MAX = 220;
const SIZE_STEP = 4;
const MOVE_STEP = 2;

function metalTextStyle(gradient: string): CSSProperties {
  return {
    backgroundImage: gradient,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  };
}

function readableTextColor(hex: string) {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#141414" : "#FFFFFF";
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function SectionLabel({
  icon: Icon,
  title,
  hint,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-2 flex items-start justify-between gap-2 sm:mb-3 sm:gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FFFCF7] text-[#BC7C10] ring-1 ring-[#BC7C10]/15 sm:h-8 sm:w-8 sm:rounded-lg">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
        </span>
        <div>
          <p className="text-xs font-semibold text-[#141414] sm:text-sm">
            {title}
          </p>
          {hint ? (
            <p className="text-[10px] leading-snug text-[#5c5346]/80 sm:text-xs">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-full border bg-white text-[#141414] transition-all duration-150 hover:scale-105 active:scale-95 sm:h-10 sm:w-10 ${
        active
          ? "border-[#BC7C10] shadow-sm shadow-[#BC7C10]/20"
          : "border-black/15 hover:border-black/30"
      }`}
    >
      {children}
    </button>
  );
}

/** trash · − · + · ← → ↓ ↑ · ✓ — compact single row on mobile */
function LogoToolbar({
  onDelete,
  onShrink,
  onGrow,
  onMove,
  onConfirm,
  confirmed,
}: {
  onDelete: () => void;
  onShrink: () => void;
  onGrow: () => void;
  onMove: (dx: number, dy: number) => void;
  onConfirm: () => void;
  confirmed: boolean;
}) {
  const icon = "h-3 w-3 sm:h-4 sm:w-4";
  return (
    <div className="grid w-full grid-cols-8 place-items-center gap-0.5 sm:flex sm:flex-nowrap sm:justify-center sm:gap-2.5">
      <ToolBtn label="Remove logo" onClick={onDelete}>
        <Trash2 className={icon} strokeWidth={2.25} />
      </ToolBtn>
      <ToolBtn label="Make smaller" onClick={onShrink}>
        <Minus className={icon} strokeWidth={2.5} />
      </ToolBtn>
      <ToolBtn label="Make larger" onClick={onGrow}>
        <Plus className={icon} strokeWidth={2.5} />
      </ToolBtn>
      <ToolBtn label="Move left" onClick={() => onMove(-MOVE_STEP, 0)}>
        <ArrowLeft className={icon} strokeWidth={2.25} />
      </ToolBtn>
      <ToolBtn label="Move right" onClick={() => onMove(MOVE_STEP, 0)}>
        <ArrowRight className={icon} strokeWidth={2.25} />
      </ToolBtn>
      <ToolBtn label="Move down" onClick={() => onMove(0, MOVE_STEP)}>
        <ArrowDown className={icon} strokeWidth={2.25} />
      </ToolBtn>
      <ToolBtn label="Move up" onClick={() => onMove(0, -MOVE_STEP)}>
        <ArrowUp className={icon} strokeWidth={2.25} />
      </ToolBtn>
      <ToolBtn label="Confirm position" onClick={onConfirm} active={confirmed}>
        <Check className={icon} strokeWidth={2.75} />
      </ToolBtn>
    </div>
  );
}

function PlacedLogo({
  src,
  layout,
  selected,
  onSelect,
  centered,
  placeholder,
  onPlaceholderClick,
  placeholderColor,
}: {
  src: string | null;
  layout: LogoLayout;
  selected: boolean;
  onSelect: () => void;
  centered?: boolean;
  placeholder?: boolean;
  onPlaceholderClick?: () => void;
  placeholderColor?: string;
}) {
  const isEmpty = !src;
  const [aspect, setAspect] = useState(1);
  const maxW = CARD_W - 16;
  const maxH = CARD_H - 16;
  let width = Math.min(layout.size, maxW);
  let height = width / aspect;
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (isEmpty) {
          onPlaceholderClick?.();
          return;
        }
        onSelect();
      }}
      className="absolute z-20 touch-manipulation transition-[box-shadow] duration-150"
      style={{
        width,
        height,
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        transform: centered ? "translate(-50%, -50%)" : "translate(0, 0)",
        boxShadow: selected && !isEmpty ? "0 0 0 0.5px rgba(0, 0, 0, 0.75)" : "none",
      }}
      aria-label={isEmpty ? "Upload logo" : "Select logo to adjust"}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Card logo"
          className="h-full w-full object-contain object-center select-none"
          style={{ imageRendering: "auto" }}
          draggable={false}
          onLoad={(e) => {
            const w = e.currentTarget.naturalWidth;
            const h = e.currentTarget.naturalHeight;
            if (w > 0 && h > 0) setAspect(w / h);
          }}
        />
      ) : placeholder ? (
        <span
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-md border border-dashed opacity-55"
          style={{
            borderColor: placeholderColor ?? "#888",
            color: placeholderColor ?? "#888",
          }}
        >
          <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="text-[6px] font-semibold tracking-wide uppercase">
            Logo
          </span>
        </span>
      ) : null}
    </button>
  );
}

/** Back-side empty state — embossed “YOUR LOGO HERE” circle (gold / silver / accent) */
function BackLogoPlaceholder({
  fill,
  isGradient,
  cardBodyColor,
  onClick,
}: {
  fill: string;
  isGradient: boolean;
  cardBodyColor: string;
  onClick: () => void;
}) {
  const foilText: CSSProperties = isGradient
    ? metalTextStyle(fill)
    : { color: fill };
  const foilBg: CSSProperties = isGradient
    ? { background: fill }
    : { backgroundColor: fill };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute inset-0 z-20 flex items-center justify-center"
      aria-label="Upload logo"
    >
      {/* Outer foil ring — medium size */}
      <span
        className="relative flex aspect-square w-[37%] max-w-[132px] items-center justify-center rounded-full p-[3px] shadow-[0_3px_10px_rgba(0,0,0,0.4)]"
        style={foilBg}
      >
        {/* Inner plate = card body */}
        <span
          className="relative flex h-full w-full flex-col items-center justify-center rounded-full px-2.5 text-center"
          style={{ backgroundColor: cardBodyColor }}
        >
          <span
            className="text-[11px] leading-[1.15] font-extrabold tracking-[0.12em] uppercase drop-shadow-sm"
            style={foilText}
          >
            Your
          </span>
          <span
            className="text-[11px] leading-[1.15] font-extrabold tracking-[0.12em] uppercase drop-shadow-sm"
            style={foilText}
          >
            Logo
          </span>
          <span
            className="text-[11px] leading-[1.15] font-extrabold tracking-[0.12em] uppercase drop-shadow-sm"
            style={foilText}
          >
            Here
          </span>
          <span className="relative mt-2 flex h-2 w-12 items-center justify-center">
            <span className="absolute h-px w-full rounded-full" style={foilBg} />
            <span className="relative z-[1] h-1.5 w-1.5 rounded-full" style={foilBg} />
          </span>
        </span>
      </span>
    </button>
  );
}

export default function CardCustomizer() {
  const router = useRouter();
  const [side, setSide] = useState<Side>("front");
  const [cardBody, setCardBody] = useState<CardBody>("black");
  const [cardMode, setCardMode] = useState<CardMode>("gold");
  const [accentColor, setAccentColor] = useState<string>(
    whiteCardAccents[0].color,
  );
  const [title, setTitle] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [moreDetails, setMoreDetails] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [displayLogo, setDisplayLogo] = useState<string | null>(null);
  const [frontLogo, setFrontLogo] = useState<LogoLayout>(FRONT_LOGO_DEFAULT);
  const [backLogo, setBackLogo] = useState<LogoLayout>(BACK_LOGO_DEFAULT);
  const [logoEditing, setLogoEditing] = useState(false);
  const [logoConfirmed, setLogoConfirmed] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [flipPulse, setFlipPulse] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoObjectUrl = useRef<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(PREVIEW_MAX_W / CARD_W);

  const isBlackCard = cardBody === "black";
  const isCustomize = !isBlackCard; // white card → customize accents only
  const metalPreset =
    isBlackCard && (cardMode === "gold" || cardMode === "silver")
      ? getMetalPreset(cardMode)
      : null;

  const displayCardColor = CARD_BODY[cardBody];
  // White-card gold uses the same foil as black-card gold
  const isWhiteGold = isCustomize && accentColor === GOLD_SOLID;
  const metalGradient =
    metalPreset?.gradient ?? (isWhiteGold ? GOLD_GRADIENT : null);
  const foilStops = metalPreset?.stops ?? (isWhiteGold ? GOLD_STOPS : null);
  const foilGradId = metalPreset
    ? `cardMetalGrad-${cardMode}`
    : isWhiteGold
      ? "cardMetalGrad-white-gold"
      : null;

  // White card: selected accent drives name, details, wifi & QR
  const displayTextColor = isCustomize
    ? accentColor
    : (metalPreset?.contentColor ?? GOLD_SOLID);
  const displayTextStyle: CSSProperties = metalGradient
    ? metalTextStyle(metalGradient)
    : { color: displayTextColor };
  const displayAccentColor = isCustomize
    ? accentColor
    : (metalPreset?.accentColor ?? accentColor);
  const logoFinish =
    metalPreset && (cardMode === "gold" || cardMode === "silver")
      ? cardMode
      : isWhiteGold
        ? "gold"
        : null;

  const previewQrSvg = buildStyledQrSvg("https://hexacards.com", {
    color:
      metalPreset && cardMode === "silver"
        ? "#A8ACB0"
        : isCustomize
          ? accentColor
          : displayAccentColor,
    gold: Boolean((metalPreset && cardMode === "gold") || isWhiteGold),
    silver: Boolean(metalPreset && cardMode === "silver"),
    includeFrame: true,
    background: isBlackCard ? CARD_BODY.black : CARD_BODY.white,
    gradientId: "qr-studio-foil",
  });

  const hasExtraLine = moreDetails.trim().length > 0;

  const progress =
    (title.trim() ? 1 : 0) +
    (subTitle.trim() ? 1 : 0) +
    (logoUrl ? 1 : 0) +
    1;
  const progressPct = Math.round((progress / 4) * 100);

  useEffect(() => {
    return () => {
      if (logoObjectUrl.current) URL.revokeObjectURL(logoObjectUrl.current);
    };
  }, []);

  useEffect(() => {
    if (!logoUrl) {
      setDisplayLogo(null);
      return;
    }
    let cancelled = false;
    // No foil — show the uploaded file exactly as-is (full canvas, no processing).
    if (!logoFinish) {
      setDisplayLogo(logoUrl);
      return;
    }
    setDisplayLogo(logoUrl);
    void logoForCardFinish(logoUrl, logoFinish).then((next) => {
      if (!cancelled && next) setDisplayLogo(next);
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl, logoFinish]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const syncScale = () => {
      setPreviewScale(el.clientWidth / CARD_W);
    };
    syncScale();
    const ro = new ResizeObserver(syncScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setLogoConfirmed(false);
  }, [side]);

  // Land on the card editor when arriving via #card-studio (Design Your Card CTA)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#card-studio") return;
    const el = document.getElementById("card-studio");
    if (!el) return;
    // Wait a tick for layout/sticky nav
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  function updateLogo(patch: Partial<LogoLayout>) {
    // Front logo is disabled — always adjust back logo
    setBackLogo((prev) => ({
      size: clamp(patch.size ?? prev.size, SIZE_MIN, SIZE_MAX),
      x: clamp(patch.x ?? prev.x, 0, 92),
      y: clamp(patch.y ?? prev.y, 0, 88),
    }));
    setLogoConfirmed(false);
    setLogoEditing(true);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPng =
      file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    if (!isPng) {
      setLogoError("Only PNG files are accepted. Please upload a .png logo.");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setLogoError(null);
    if (logoObjectUrl.current) URL.revokeObjectURL(logoObjectUrl.current);
    logoObjectUrl.current = null;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl.startsWith("data:image/")) {
        setLogoError("Could not read that PNG. Please try another file.");
        return;
      }
      setLogoUrl(dataUrl);
      setFrontLogo(FRONT_LOGO_DEFAULT);
      setBackLogo(BACK_LOGO_DEFAULT);
      setSide("back");
      setLogoEditing(true);
      setLogoConfirmed(false);
      setFlipPulse(true);
      window.setTimeout(() => setFlipPulse(false), 4500);
    };
    reader.onerror = () => {
      setLogoError("Could not read that PNG. Please try another file.");
    };
    reader.readAsDataURL(file);
  }

  function flipTo(next: Side) {
    setSide(next);
    setFlipPulse(false);
  }

  function removeLogo() {
    if (logoObjectUrl.current) URL.revokeObjectURL(logoObjectUrl.current);
    logoObjectUrl.current = null;
    setLogoUrl(null);
    setLogoError(null);
    setFrontLogo(FRONT_LOGO_DEFAULT);
    setBackLogo(BACK_LOGO_DEFAULT);
    setLogoEditing(false);
    setLogoConfirmed(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function resetDesign() {
    setSide("front");
    setCardBody("black");
    setCardMode("gold");
    setAccentColor(whiteCardAccents[0].color);
    setTitle("");
    setSubTitle("");
    setMoreDetails("");
    removeLogo();
  }

  function selectCardBody(body: CardBody) {
    setCardBody(body);
    if (body === "black") {
      setCardMode("gold");
      setAccentColor(getMetalPreset("gold").accentColor);
    } else {
      setCardMode("customize");
      setAccentColor(whiteCardAccents[0].color);
    }
  }

  function selectMetalMode(mode: MetalMode) {
    setCardMode(mode);
    setAccentColor(getMetalPreset(mode).accentColor);
  }

  function handleSubmit() {
    const name = title.trim();
    const design = {
      side,
      cardBody,
      cardMode: isBlackCard ? cardMode : "customize",
      cardColor: displayCardColor,
      accentColor: displayAccentColor,
      textColor: displayTextColor,
      title: name,
      subTitle: subTitle.trim(),
      moreDetails: moreDetails.trim(),
      hasLogo: Boolean(logoUrl),
      logoUrl,
      backLogo,
      savedAt: Date.now(),
    };

    try {
      sessionStorage.setItem("hexaCardDesign", JSON.stringify(design));
    } catch {
      // ignore storage failures — still continue to checkout
    }

    setSavedFlash(true);
    window.setTimeout(() => {
      goToCheckout(router, "/checkout");
    }, 450);
  }

  return (
    <div className="min-h-[70vh] bg-[#FFFCF7]">
      {/* Compact page intro — keeps card editor in first viewport */}
      <div className="border-b border-black/[0.06] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:gap-4 sm:px-8 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <p className="shrink-0 text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase sm:text-xs">
              Card Studio
            </p>
            <h1 className="text-base font-extrabold tracking-tight text-[#141414] sm:text-lg lg:text-xl">
              Design Your Hexa Card
            </h1>
            <p className="ml-auto hidden max-w-md truncate text-xs text-[#5c5346] lg:block">
              Colors, details & logo — preview updates live
            </p>
          </div>
          <a
            href="/product/nfc-business-card"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#BC7C10] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </a>
        </div>
      </div>

      <div
        id="card-studio"
        className="mx-auto grid max-w-6xl scroll-mt-[88px] grid-cols-1 gap-0 px-0 pb-8 sm:scroll-mt-[100px] sm:gap-0 sm:px-0 sm:pb-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:py-8"
      >
        {/* Preview — sticky on mobile so form scrolls underneath */}
        <div
          className="sticky top-[80px] z-30 self-start border-b border-black/[0.06] bg-[#FFFCF7]/95 px-4 pt-3 pb-3 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:top-[92px] sm:px-6 lg:top-28 lg:z-auto lg:border-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0 lg:shadow-none lg:backdrop-blur-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-3 hidden items-start gap-3 rounded-2xl border border-[#BC7C10]/25 bg-[#FFFCF7] p-4 shadow-sm lg:flex"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm">
              <WhatsAppIcon className="h-5 w-5" />
            </span>
            <p className="text-sm leading-relaxed text-[#141414]">
              Need a free custom mockup? Chat with our designer on WhatsApp —
              pay only after you approve.{" "}
              <a
                href="https://api.whatsapp.com/send?phone=9226286898"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#25D366] underline decoration-[#25D366]/40 underline-offset-2 transition-colors hover:text-[#1ebe57]"
              >
                Open WhatsApp
              </a>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:rounded-3xl sm:p-5 lg:mt-6 lg:p-7 lg:shadow-[0_16px_48px_rgba(15,23,42,0.06)]"
          >
            <div className="mb-3 flex flex-col gap-2.5 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="hidden items-center gap-2 sm:flex">
                <Sparkles className="h-4 w-4 text-[#BC7C10]" />
                <p className="text-sm font-semibold text-[#141414]">
                  Live preview
                </p>
              </div>
              <motion.div
                animate={
                  flipPulse
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(188,124,16,0)",
                          "0 0 0 4px rgba(188,124,16,0.35)",
                          "0 0 0 0 rgba(188,124,16,0)",
                        ],
                      }
                    : { boxShadow: "0 0 0 0 rgba(188,124,16,0)" }
                }
                transition={
                  flipPulse
                    ? { duration: 1.1, repeat: 3, ease: "easeInOut" }
                    : { duration: 0.2 }
                }
                className="inline-flex w-full rounded-full bg-[#141414] p-1 sm:w-auto"
                role="group"
                aria-label="Card side"
              >
                {(["front", "back"] as const).map((value) => {
                  const active = side === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => flipTo(value)}
                      aria-pressed={active}
                      className={`relative flex-1 rounded-full px-5 py-2 text-xs font-bold tracking-wide uppercase transition-colors sm:flex-none ${
                        active
                          ? "bg-[#BC7C10] text-white"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </motion.div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-black/[0.04] bg-[#FFFCF7]">
              {/* Light hex pattern behind the card */}
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden
              >
                <svg
                  className="absolute inset-0 h-full w-full"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <pattern
                      id="previewHexTile"
                      width="72"
                      height="62"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M36 3 L67 21 L67 45 L36 63 L5 45 L5 21 Z"
                        fill="none"
                        stroke="#BC7C10"
                        strokeOpacity="0.22"
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M72 34 L103 52 L103 76 L72 94 L41 76 L41 52 Z"
                        fill="none"
                        stroke="#BC7C10"
                        strokeOpacity="0.14"
                        strokeWidth="1"
                        strokeLinejoin="round"
                        transform="translate(-36 -31)"
                      />
                    </pattern>
                    <radialGradient id="previewHexFade" cx="50%" cy="48%" r="68%">
                      <stop offset="0%" stopColor="#FFFCF7" stopOpacity="0.15" />
                      <stop offset="55%" stopColor="#FFFCF7" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#FFFCF7" stopOpacity="0.92" />
                    </radialGradient>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#previewHexTile)" />
                  <rect width="100%" height="100%" fill="url(#previewHexFade)" />
                </svg>
              </div>

              <div className="relative z-10 flex flex-col items-center px-3 py-4 sm:px-6 sm:py-10">
                {/* <p className="mb-3 text-[11px] font-semibold tracking-wide text-[#5c5346]/80 uppercase">
                  Card size {CARD_W} × {CARD_H} px
                </p> */}

                {/* Stage: layout box = scaled size; inner canvas stays exactly 244×154 */}
                <div
                  ref={stageRef}
                  className="relative w-full max-w-[488px] [perspective:1200px]"
                  style={{
                    aspectRatio: `${CARD_W} / ${CARD_H}`,
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={side}
                      initial={{
                        rotateY: side === "front" ? -18 : 18,
                        opacity: 0.6,
                      }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{
                        rotateY: side === "front" ? 18 : -18,
                        opacity: 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 160,
                        damping: 18,
                      }}
                      className="absolute inset-0"
                      onClick={() => setLogoEditing(false)}
                    >
                      {/* True design canvas: 244 × 154 — scaled up only for screen preview */}
                      {/* True design canvas: 244 × 154 — scaled up only for screen preview */}
                      <div
                        className="absolute top-0 left-0 overflow-hidden rounded-[10px] shadow-2xl"
                        style={{
                          width: CARD_W,
                          height: CARD_H,
                          transform: `scale(${previewScale})`,
                          transformOrigin: "top left",
                          backgroundColor: displayCardColor,
                          /* Hairline edge — stays crisp after scale (~0.5px on screen at 2×) */
                          boxShadow: `
                            0 0 0 ${0.5 / previewScale}px rgba(0, 0, 0, 0.55),
                            0 20px 40px -16px ${displayCardColor}99
                          `,
                        }}
                      >
                        {/* Wifi — both front & back */}
                        {foilStops && foilGradId ? (
                          <svg
                            width="0"
                            height="0"
                            className="absolute"
                            aria-hidden
                          >
                            <defs>
                              <linearGradient
                                id={foilGradId}
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="0%"
                              >
                                {foilStops.map((stop) => (
                                  <stop
                                    key={stop.offset}
                                    offset={stop.offset}
                                    stopColor={stop.color}
                                  />
                                ))}
                              </linearGradient>
                            </defs>
                          </svg>
                        ) : null}
                        <Wifi
                          className="absolute top-3 right-3 z-30 h-4 w-4 rotate-90"
                          color={
                            foilGradId
                              ? `url(#${foilGradId})`
                              : displayAccentColor
                          }
                          strokeWidth={2.5}
                        />

                        {side === "front" ? (
                          <>
                            {/* Front logo — hidden for now
                            <PlacedLogo
                              src={logoUrl}
                              layout={frontLogo}
                              selected={logoEditing}
                              onSelect={() => setLogoEditing(true)}
                              placeholder
                              placeholderColor={displayTextColor}
                              tint={logoTint}
                              onPlaceholderClick={() =>
                                logoInputRef.current?.click()
                              }
                            />
                            */}

                            <div
                              className={`absolute bottom-3 left-3 z-10 max-w-[54%] ${
                                hasExtraLine ? "" : "pb-0.5"
                              }`}
                            >
                              <p
                                className={`leading-[1.15] font-bold tracking-[-0.01em] ${
                                  hasExtraLine ? "text-[15px]" : "text-[16px]"
                                }`}
                                style={displayTextStyle}
                              >
                                {title.trim() || "Your Name"}
                              </p>
                              <p
                                className={`mt-1 leading-snug font-medium ${
                                  hasExtraLine ? "text-[10px]" : "text-[11px]"
                                } ${metalGradient ? "opacity-95" : "opacity-90"}`}
                                style={displayTextStyle}
                              >
                                {subTitle.trim() || "Title or company"}
                              </p>
                              {hasExtraLine ? (
                                <p
                                  className={`mt-0.5 text-[9.5px] leading-snug font-medium ${
                                    metalGradient ? "opacity-85" : "opacity-75"
                                  }`}
                                  style={displayTextStyle}
                                >
                                  {moreDetails.trim()}
                                </p>
                              ) : null}
                            </div>

                            {/* QR — dotted rounded pattern, same as print PDFs */}
                            <div
                              className="absolute right-2.5 bottom-2.5 z-10 h-[62px] w-[62px]"
                              aria-label="Hexa QR"
                              dangerouslySetInnerHTML={{ __html: previewQrSvg }}
                            />
                          </>
                        ) : logoUrl ? (
                          <PlacedLogo
                            src={displayLogo ?? logoUrl}
                            layout={backLogo}
                            selected={logoEditing}
                            onSelect={() => setLogoEditing(true)}
                            centered
                          />
                        ) : (
                          <BackLogoPlaceholder
                            fill={metalGradient ?? displayAccentColor}
                            isGradient={Boolean(metalGradient)}
                            cardBodyColor={displayCardColor}
                            onClick={() => logoInputRef.current?.click()}
                          />
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Back logo adjust toolbar — under preview */}
            <AnimatePresence>
              {logoUrl && side === "back" ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="mt-2 rounded-xl border border-black/[0.06] bg-[#FFFCF7] px-1.5 py-2 sm:mt-5 sm:rounded-2xl sm:px-3 sm:py-4"
                >
                  <p className="mb-3 hidden text-center text-[11px] font-semibold tracking-wide text-[#5c5346] uppercase sm:block">
                    Adjust back logo · size {Math.round(backLogo.size)}px
                  </p>
                  <LogoToolbar
                    onDelete={removeLogo}
                    onShrink={() =>
                      updateLogo({ size: backLogo.size - SIZE_STEP })
                    }
                    onGrow={() =>
                      updateLogo({ size: backLogo.size + SIZE_STEP })
                    }
                    onMove={(dx, dy) =>
                      updateLogo({
                        x: backLogo.x + dx,
                        y: backLogo.y + dy,
                      })
                    }
                    onConfirm={() => {
                      setLogoConfirmed(true);
                      setLogoEditing(false);
                    }}
                    confirmed={logoConfirmed}
                  />
                  <button
                    type="button"
                    onClick={() => flipTo("front")}
                    className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all sm:mt-4 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm ${
                      flipPulse
                        ? "bg-[#BC7C10] text-white shadow-md shadow-[#BC7C10]/30 ring-2 ring-[#BC7C10]/40 ring-offset-2 ring-offset-[#FFFCF7]"
                        : "border border-black/10 bg-white text-[#141414] hover:border-[#BC7C10]/35 hover:text-[#BC7C10]"
                    }`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    View front side
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Status chips — hidden for now
            <div className="mt-5 hidden flex-wrap items-center justify-center gap-2 text-[11px] text-[#5c5346] lg:flex">
              <span className="rounded-full bg-[#FFFCF7] px-2.5 py-1 ring-1 ring-black/5 capitalize">
                {isBlackCard ? `${cardMode} black` : "white"} card
              </span>
              <span className="rounded-full bg-[#FFFCF7] px-2.5 py-1 ring-1 ring-black/5 capitalize">
                Text {metalGradient ? `${cardMode} foil` : displayTextColor}
              </span>
              <span className="rounded-full bg-[#FFFCF7] px-2.5 py-1 ring-1 ring-black/5">
                Accent{" "}
                {metalGradient ? `${cardMode} foil` : displayAccentColor}
              </span>
            </div>
            */}

            <div className="mx-auto mt-6 hidden w-full max-w-sm lg:block">
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-[#5c5346]">Design progress</span>
                <span className="text-[#BC7C10]">{progressPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-[#BC7C10]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="relative z-0 space-y-3 px-4 pt-4 sm:space-y-5 sm:px-8 lg:px-0 lg:pt-0"
        >
          {/* Mobile WhatsApp + progress (scrolls under sticky card) */}
          <div className="flex items-start gap-2.5 rounded-xl border border-[#BC7C10]/25 bg-white p-3 shadow-sm lg:hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm">
              <WhatsAppIcon className="h-4 w-4" />
            </span>
            <p className="text-xs leading-relaxed text-[#141414]">
              Need a free custom mockup? Chat on WhatsApp — pay only after you
              approve.{" "}
              <a
                href="https://api.whatsapp.com/send?phone=9226286898"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#25D366] underline decoration-[#25D366]/40 underline-offset-2"
              >
                Open WhatsApp
              </a>
            </p>
          </div>

          <div className="rounded-xl border border-black/[0.06] bg-white p-3 shadow-sm lg:hidden">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-[#5c5346]">Design progress</span>
              <span className="text-[#BC7C10]">{progressPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
              <motion.div
                className="h-full rounded-full bg-[#BC7C10]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
          <div className="hidden rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5 lg:block">
            <SectionLabel
              icon={Sparkles}
              title="Card side"
              hint="Switch between front and back artwork"
            />
            <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-[#FFFCF7] p-1.5 ring-1 ring-black/[0.04]">
              {(["front", "back"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => flipTo(value)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold capitalize transition-all duration-200 ${
                    side === value
                      ? "bg-[#141414] text-white shadow-md"
                      : "text-[#5c5346] hover:bg-white hover:text-[#141414]"
                  }`}
                >
                  {value} side
                </button>
              ))}
            </div>
          </div>

          {/* Card type: Black | White */}
          <div className="rounded-xl border border-black/[0.06] bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
            <SectionLabel
              icon={Palette}
              title="Card type"
              hint="Black → gold/silver foil · White → custom accent colors"
            />
            <div className="flex flex-wrap items-start gap-4 sm:gap-8">
              {(
                [
                  { id: "black" as const, label: "Black Card", color: CARD_BODY.black },
                  { id: "white" as const, label: "White Card", color: CARD_BODY.white },
                ] as const
              ).map((type) => {
                const selected = cardBody === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => selectCardBody(type.id)}
                    aria-pressed={selected}
                    aria-label={type.label}
                    className="flex flex-col items-center gap-1.5 sm:gap-2"
                  >
                    <span
                      className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 sm:h-12 sm:w-12 ${
                        selected
                          ? "ring-2 ring-[#BC7C10] ring-offset-1 ring-offset-white sm:ring-offset-2"
                          : "ring-1 ring-black/10"
                      }`}
                      style={{
                        backgroundColor: type.color,
                        border:
                          type.id === "white"
                            ? "1.5px solid rgba(20,20,20,0.18)"
                            : undefined,
                      }}
                    >
                      {selected ? (
                        <Check
                          className="h-3.5 w-3.5 drop-shadow sm:h-4 sm:w-4"
                          style={{
                            color: type.id === "white" ? "#141414" : "#FFFFFF",
                          }}
                          strokeWidth={3}
                        />
                      ) : null}
                    </span>
                    <span
                      className={`text-[11px] font-semibold sm:text-sm ${
                        selected ? "text-[#BC7C10]" : "text-[#5c5346]"
                      }`}
                    >
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Black card → Gold / Silver only */}
            {isBlackCard ? (
              <div className="mt-3.5 sm:mt-5">
                <p className="mb-2 text-[11px] font-semibold text-[#5c5346] sm:mb-3 sm:text-xs">
                  Finish color
                </p>
                <div className="flex flex-wrap items-start gap-4 sm:gap-8">
                  {METAL_MODES.map((mode) => {
                    const selected = cardMode === mode.id;
                    const swatchStyle =
                      mode.id === "gold"
                        ? { background: GOLD_GRADIENT }
                        : { background: SILVER_GRADIENT };
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => selectMetalMode(mode.id)}
                        aria-pressed={selected}
                        aria-label={mode.label}
                        className="flex flex-col items-center gap-1.5 sm:gap-2"
                      >
                        <span
                          className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 sm:h-12 sm:w-12 ${
                            selected
                              ? "ring-2 ring-[#BC7C10] ring-offset-1 ring-offset-white sm:ring-offset-2"
                              : "ring-1 ring-black/10"
                          }`}
                          style={swatchStyle}
                        >
                          {selected ? (
                            <Check
                              className="h-3.5 w-3.5 text-white drop-shadow sm:h-4 sm:w-4"
                              strokeWidth={3}
                            />
                          ) : null}
                        </span>
                        <span
                          className={`text-[11px] font-semibold sm:text-sm ${
                            selected ? "text-[#BC7C10]" : "text-[#5c5346]"
                          }`}
                        >
                          {mode.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-3.5 sm:mt-5">
                <p className="mb-1.5 text-[11px] font-semibold text-[#5c5346] sm:mb-3 sm:text-xs">
                  Accent color
                </p>
                {/* <p className="mb-2 hidden text-xs text-[#5c5346]/75 sm:mb-3 sm:block">
                  Applies to name, details, wifi & QR
                </p> */}
                <div className="flex flex-wrap gap-2.5 sm:gap-4">
                  {whiteCardAccents.map((swatch) => (
                    <button
                      key={swatch.color + swatch.label}
                      type="button"
                      onClick={() => setAccentColor(swatch.color)}
                      aria-pressed={accentColor === swatch.color}
                      aria-label={swatch.label}
                      className="flex flex-col items-center gap-1 sm:gap-1.5"
                    >
                      <span
                        className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 sm:h-10 sm:w-10 ${
                          accentColor === swatch.color
                            ? "ring-2 ring-[#BC7C10] ring-offset-1 ring-offset-white sm:ring-offset-2"
                            : "ring-1 ring-black/10"
                        }`}
                        style={{
                          background:
                            swatch.color === GOLD_SOLID
                              ? GOLD_GRADIENT
                              : swatch.color,
                        }}
                      >
                        {accentColor === swatch.color ? (
                          <Check
                            className="h-3 w-3 drop-shadow sm:h-3.5 sm:w-3.5"
                            style={{
                              color: readableTextColor(swatch.color),
                            }}
                            strokeWidth={3}
                          />
                        ) : null}
                      </span>
                      <span className="max-w-[3.5rem] text-center text-[9px] font-medium text-[#5c5346] sm:max-w-[4.5rem] sm:text-[10px]">
                        {swatch.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-black/[0.06] bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
            <SectionLabel
              icon={Type}
              title="Card details"
              hint="Name & subtitle show on the front · extra line is optional"
            />
            <div className="space-y-3 sm:space-y-4">
              <label className="block">
                <div className="mb-1 flex items-center justify-between sm:mb-1.5">
                  <span className="text-xs font-medium text-[#5c5346] sm:text-sm">
                    Name / Title
                  </span>
                  <span className="text-[10px] text-[#5c5346]/70 sm:text-[11px]">
                    {title.length}/40
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  maxLength={40}
                  onChange={(e) => {
                    setTitle(e.target.value);
                  }}
                  placeholder="e.g. Rohit Agrawal"
                  className={`w-full rounded-lg border border-black/10 bg-[#FFFCF7] px-3 py-2 text-xs text-[#141414] outline-none transition-all placeholder:text-[#5c5346]/45 focus:bg-white focus:ring-2 focus:border-[#BC7C10]/50 focus:ring-[#BC7C10]/15 sm:rounded-xl sm:px-3.5 sm:py-3 sm:text-sm`}
                />
              </label>

              <label className="block">
                <div className="mb-1 flex items-center justify-between sm:mb-1.5">
                  <span className="text-xs font-medium text-[#5c5346] sm:text-sm">
                    Subtitle
                  </span>
                  <span className="text-[10px] text-[#5c5346]/70 sm:text-[11px]">
                    {subTitle.length}/48
                  </span>
                </div>
                <input
                  type="text"
                  value={subTitle}
                  maxLength={48}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="e.g. Founder · CEO · Director · Manager"
                  className="w-full rounded-lg border border-black/10 bg-[#FFFCF7] px-3 py-2 text-xs text-[#141414] outline-none transition-all placeholder:text-[#5c5346]/45 focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 sm:rounded-xl sm:px-3.5 sm:py-3 sm:text-sm"
                />
              </label>

              <label className="block">
                <div className="mb-1 flex items-center justify-between sm:mb-1.5">
                  <span className="text-xs font-medium text-[#5c5346] sm:text-sm">
                    Extra line{" "}
                    <span className="font-normal text-[#5c5346]/60">
                      (optional)
                    </span>
                  </span>
                  <span className="text-[10px] text-[#5c5346]/70 sm:text-[11px]">
                    {moreDetails.length}/56
                  </span>
                </div>
                <input
                  type="text"
                  value={moreDetails}
                  maxLength={56}
                  onChange={(e) => setMoreDetails(e.target.value)}
                  placeholder="Phone, email, or link — only shows if filled"
                  className="w-full rounded-lg border border-black/10 bg-[#FFFCF7] px-3 py-2 text-xs text-[#141414] outline-none transition-all placeholder:text-[#5c5346]/45 focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 sm:rounded-xl sm:px-3.5 sm:py-3 sm:text-sm"
                />
              </label>
            </div>
          </div>

          <div
            className={`rounded-xl border bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5 ${
              logoError && !logoUrl
                ? "border-red-300"
                : "border-black/[0.06]"
            }`}
          >
            <SectionLabel
              icon={ImageIcon}
              title="Logo / image"
              hint={
                isCustomize
                  ? "Optional · back side only · original logo colors"
                  : `Optional · back side only · tinted ${cardMode === "gold" ? "gold" : "silver"}`
              }
            />
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,.png"
              onChange={handleLogoChange}
              className="sr-only"
            />
            <div className="mb-1 rounded-lg border border-[#BC7C10]/20 bg-[#FFFCF7] px-1.5 py-1 text-[10px] leading-relaxed text-[#5c5346] sm:mb-3 sm:rounded-xl sm:px-3.5 sm:py-3 sm:text-xs">
              <p className="font-semibold text-[#141414]">
                PNG only · transparent background recommended
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className={`inline-flex items-center gap-1.5 rounded-full border bg-[#FFFCF7] px-3.5 py-2 text-xs font-semibold text-[#141414] transition-all hover:bg-white sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${
                  logoError && !logoUrl
                    ? "border-red-400"
                    : "border-black/10 hover:border-[#BC7C10]/35"
                }`}
              >
                <Upload className="h-3.5 w-3.5 text-[#BC7C10] sm:h-4 sm:w-4" />
                {logoUrl ? "Change logo" : "Upload PNG logo"}
              </button>
              {logoUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSide("back");
                      setLogoEditing(true);
                    }}
                    className="text-xs font-semibold text-[#BC7C10] underline-offset-2 hover:underline sm:text-sm"
                  >
                    Adjust on back
                  </button>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-xs font-medium text-[#5c5346] underline-offset-2 hover:text-[#141414] hover:underline sm:text-sm"
                  >
                    Remove
                  </button>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    Logo added
                  </span>
                </>
              ) : null}
            </div>
            {logoError ? (
              <p
                role="alert"
                className="mt-2 text-xs font-medium text-red-600 sm:mt-3 sm:text-sm"
              >
                {logoError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={resetDesign}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-[#FFFCF7] sm:gap-2 sm:rounded-xl sm:px-5 sm:py-3.5 sm:text-sm"
            >
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex flex-[1.4] items-center justify-center gap-1.5 rounded-lg bg-[#BC7C10] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99] sm:gap-2 sm:rounded-xl sm:px-5 sm:py-3.5 sm:text-sm"
            >
              {savedFlash ? "Going to checkout…" : "Submit details"}
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

          <AnimatePresence>
            {savedFlash ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm font-medium text-[#BC7C10]"
              >
                Design captured — our team will follow up shortly.
              </motion.p>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
