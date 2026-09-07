"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  buildOrderCardDesign,
  buildOrderCardDesignAsync,
  isPdfLogoSrc,
  logoForCardFinish,
  prepareCardLogoDataUrl,
  printFinishLabel,
  toBlackLogoDataUrl,
  CARD_CORNER_RADIUS_IN,
  CARD_PRINT_HEIGHT_IN,
  CARD_PRINT_SIZE_LABEL,
  CARD_PRINT_WIDTH_IN,
  STUDIO_CARD_WIDTH,
  clampLogoLayout,
  type OrderCardLogoLayout,
  type ResolvedOrderCardDesign,
} from "@/lib/order-card";
import { buildStyledQrSvg } from "@/lib/styled-qr";
import type { HexaOrder } from "@/lib/orders";
import {
  GOLD_GRADIENT,
  GOLD_SOLID,
  GOLD_STOPS,
} from "@/components/products/goldCard";
import {
  SILVER_GRADIENT,
  SILVER_SOLID,
  SILVER_STOPS,
} from "@/components/products/silverCard";

const PRINT_CARD_BG = "#FFFFFF";
const PRINT_CARD_INK = "#141414";

function isGoldAccent(color?: string) {
  const c = (color || "").trim().toUpperCase();
  return c === GOLD_SOLID.toUpperCase() || c === "#BC7C10" || c === "#C9982C";
}

function colorInk(design: ResolvedOrderCardDesign) {
  return design.accentColor?.trim() || GOLD_SOLID;
}

function isSilverFinish(design: ResolvedOrderCardDesign) {
  return design.cardBody === "black" && design.finish === "silver";
}

function isGoldFinish(design: ResolvedOrderCardDesign) {
  if (isSilverFinish(design)) return false;
  if (design.cardBody === "black") return true;
  return isGoldAccent(colorInk(design));
}

function cardFaceBg(design: ResolvedOrderCardDesign) {
  if (design.cardBody === "black") {
    return design.cardColor?.trim() || "#141414";
  }
  return "#FFFFFF";
}

/** Contactless / NFC waves — matches PVC card (Wifi rotated 90°) */
function nfcIconSvg(
  color: string,
  size = 22,
  opts?: { gold?: boolean; silver?: boolean; id?: string },
) {
  const foil = Boolean(opts?.gold || opts?.silver);
  const gradId = opts?.id ?? `nfcGrad-${size}`;
  const stops = opts?.silver ? SILVER_STOPS : GOLD_STOPS;
  const defs = foil
    ? `<defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%">${stops.map(
        (stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`,
      ).join("")}</linearGradient></defs>`
    : "";
  const stroke = foil ? `url(#${gradId})` : color;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="transform:rotate(90deg)">${defs}
    <path d="M12 20h.01" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.5 16.43a5 5 0 0 1 7 0" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 12.86a10 10 0 0 1 14 0" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M1.5 9.29a15 15 0 0 1 21 0" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function NfcIcon({
  accent,
  gold,
  silver,
  gradId,
}: {
  accent: string;
  gold?: boolean;
  silver?: boolean;
  gradId: string;
}) {
  const foil = Boolean(gold || silver);
  const stops = silver ? SILVER_STOPS : GOLD_STOPS;
  const stroke = foil ? `url(#${gradId})` : accent;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="h-full w-full rotate-90"
    >
      {foil ? (
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            {stops.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      <path
        d="M12 20h.01"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 16.43a5 5 0 0 1 7 0"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12.86a10 10 0 0 1 14 0"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.5 9.29a15 15 0 0 1 21 0"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function foilTextStyle(
  foil: "gold" | "silver" | null,
  ink: string,
): CSSProperties {
  if (!foil) return { color: ink };
  return {
    backgroundImage: foil === "silver" ? SILVER_GRADIENT : GOLD_GRADIENT,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: foil === "silver" ? SILVER_SOLID : GOLD_SOLID,
  };
}

function FramedQr({
  data,
  ink,
  gold,
  silver,
  gradientId,
  background,
}: {
  data: string;
  ink: string;
  gold?: boolean;
  silver?: boolean;
  gradientId: string;
  background: string;
}) {
  const svg = buildStyledQrSvg(data, {
    color: ink,
    gold,
    silver,
    gradientId,
    includeFrame: true,
    background,
  });

  return (
    <div
      className="h-full w-full overflow-hidden"
      aria-label="QR code"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

const BLACK_LOGO_FILTER =
  "grayscale(1) contrast(1.35) brightness(0)";

function logoLayoutBox(layout?: OrderCardLogoLayout): {
  left: string;
  top: string;
  width: string;
  maxHeight: string;
} {
  const next = clampLogoLayout(layout);
  const widthPct = (next.size / STUDIO_CARD_WIDTH) * 100;
  return {
    left: `${next.x}%`,
    top: `${next.y}%`,
    width: `${widthPct}%`,
    maxHeight: "82%",
  };
}

function BackLogo({
  src,
  layout,
  foil,
}: {
  src?: string;
  layout?: OrderCardLogoLayout;
  foil?: "gold" | "silver" | null;
}) {
  const [failed, setFailed] = useState(false);
  const [cleanSrc, setCleanSrc] = useState<string | undefined>(src);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    if (!src || isPdfLogoSrc(src)) {
      setCleanSrc(undefined);
      return;
    }
    const run = foil
      ? logoForCardFinish(src, foil)
      : prepareCardLogoDataUrl(src);
    void run.then((next) => {
      if (!cancelled) setCleanSrc(next || src);
    });
    return () => {
      cancelled = true;
    };
  }, [src, foil]);

  const box = logoLayoutBox(layout);
  const showLogo = Boolean(cleanSrc) && !failed;
  if (!showLogo) return null;

  return (
    <div
      className="absolute z-10 flex items-center justify-center overflow-hidden"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        maxHeight: box.maxHeight,
        maxWidth: "82%",
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cleanSrc}
        alt=""
        onError={() => setFailed(true)}
        className="max-h-full max-w-full object-contain object-center"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}

function CardFace({
  design,
  side,
  className = "",
}: {
  design: ResolvedOrderCardDesign;
  side: "front" | "back";
  className?: string;
}) {
  const ink = colorInk(design);
  const gold = isGoldFinish(design);
  const silver = isSilverFinish(design);
  const foil = gold ? "gold" : silver ? "silver" : null;
  const textStyle = foilTextStyle(foil, ink);
  const nfcId = `nfc-preview-${side}-${design.slug || "card"}`;
  const bg = cardFaceBg(design);

  return (
    <div
      className={`relative w-full overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${className}`}
      style={{
        backgroundColor: bg,
        containerType: "inline-size",
        aspectRatio: `${CARD_PRINT_WIDTH_IN} / ${CARD_PRINT_HEIGHT_IN}`,
        borderRadius: `${CARD_CORNER_RADIUS_IN}in`,
        border: "1px solid #d4d4d4",
      }}
    >
      <div className="absolute top-[7%] right-[4.5%] z-20 h-[14%] w-[8%]">
        <NfcIcon accent={ink} gold={gold} silver={silver} gradId={nfcId} />
      </div>

      {side === "front" ? (
        <>
          <div className="absolute bottom-[9%] left-[5.5%] right-[34%] z-10">
            <p
              className="font-dashboard truncate text-[clamp(12px,5.6cqw,20px)] font-bold leading-none whitespace-nowrap"
              style={textStyle}
            >
              {design.name}
            </p>
            <p
              className="mt-[0.35em] truncate text-[clamp(9px,3.2cqw,13px)] font-semibold leading-snug whitespace-nowrap"
              style={textStyle}
            >
              {design.subtitle}
            </p>
            {design.extraLine?.trim() ? (
              <p
                className="mt-[0.2em] truncate text-[clamp(8px,2.7cqw,11px)] font-medium leading-snug whitespace-nowrap opacity-80"
                style={textStyle}
              >
                {design.extraLine}
              </p>
            ) : null}
          </div>
          <div className="absolute right-[4.5%] bottom-[8%] z-10 w-[26%] aspect-square">
            <FramedQr
              data={design.liveUrl}
              ink={ink}
              gold={gold}
              silver={silver}
              gradientId={`qr-preview-${design.slug || "card"}`}
              background={bg}
            />
          </div>
        </>
      ) : (
        <BackLogo src={design.logoSrc} layout={design.logoLayout} foil={foil} />
      )}
    </div>
  );
}

function pdfCardShell(nfcHtml: string, inner: string, background = PRINT_CARD_BG) {
  return `
    <div class="card-page">
      <div style="
        width:${CARD_PRINT_WIDTH_IN}in;
        height:${CARD_PRINT_HEIGHT_IN}in;
        background:${background};
        border-radius:${CARD_CORNER_RADIUS_IN}in;
        position:relative;
        overflow:hidden;
        box-sizing:border-box;
      ">
        <div style="position:absolute;right:0.16in;top:0.14in;z-index:2;">
          ${nfcHtml}
        </div>
        ${inner}
      </div>
    </div>`;
}

function pdfFoilTextStyle(
  extra: string,
  ink: string,
  foil: "gold" | "silver" | null,
) {
  if (!foil) return `${extra}color:${ink};`;
  const gradient = foil === "silver" ? SILVER_GRADIENT : GOLD_GRADIENT;
  const solid = foil === "silver" ? SILVER_SOLID : GOLD_SOLID;
  return `${extra}background:${gradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;color:${solid};`;
}

function pdfFrontPageHtml(
  design: ResolvedOrderCardDesign,
  ink: string,
  foil: "gold" | "silver" | null,
  nfcHtml: string,
  background = PRINT_CARD_BG,
) {
  const name = escapeHtml(design.name);
  const subtitle = escapeHtml(design.subtitle);
  const extraLine = escapeHtml(design.extraLine?.trim() || "");
  const qrSize = "0.96in";
  const qrSvg = buildStyledQrSvg(design.liveUrl, {
    color: ink,
    gold: foil === "gold",
    silver: foil === "silver",
    includeFrame: true,
    background,
    gradientId: foil === "silver" ? "qr-pdf-silver" : foil === "gold" ? "qr-pdf-foil" : "qr-pdf-ink",
  });
  const nameStyle = pdfFoilTextStyle(
    "font-size:16pt;font-weight:700;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
    ink,
    foil,
  );
  const subStyle = pdfFoilTextStyle(
    "margin-top:0.06in;font-size:10pt;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
    ink,
    foil,
  );
  const extraStyle = pdfFoilTextStyle(
    "margin-top:0.04in;font-size:8pt;font-weight:500;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0.85;",
    ink,
    foil,
  );

  return pdfCardShell(
    nfcHtml,
    `
      <div style="
        position:absolute;
        left:0.2in;
        right:0.16in;
        bottom:0.16in;
        display:flex;
        align-items:flex-end;
        justify-content:space-between;
        gap:0.22in;
      ">
        <div style="min-width:0;flex:1;padding-right:0.06in;">
          <div style="${nameStyle}">${name}</div>
          <div style="${subStyle}">${subtitle}</div>
          ${extraLine ? `<div style="${extraStyle}">${extraLine}</div>` : ""}
        </div>
        <div style="
          flex-shrink:0;
          width:${qrSize};
          height:${qrSize};
        ">
          ${qrSvg}
        </div>
      </div>
    `,
    background,
  );
}

function pdf2FrontPageHtml(design: ResolvedOrderCardDesign) {
  return pdfFrontPageHtml(
    design,
    PRINT_CARD_INK,
    null,
    nfcIconSvg(PRINT_CARD_INK, 28, { id: "nfc-pdf2" }),
    PRINT_CARD_BG,
  );
}

function pdf3FrontPageHtml(design: ResolvedOrderCardDesign) {
  const ink = colorInk(design);
  const gold = isGoldFinish(design);
  const silver = isSilverFinish(design);
  const foil = gold ? "gold" : silver ? "silver" : null;
  return pdfFrontPageHtml(
    design,
    ink,
    foil,
    nfcIconSvg(ink, 28, { gold, silver, id: "nfc-pdf3" }),
    cardFaceBg(design),
  );
}

function pdfLogoImg(src?: string, black = false) {
  if (!src || isPdfLogoSrc(src)) return "";
  const filter = black
    ? `filter:${BLACK_LOGO_FILTER};-webkit-filter:${BLACK_LOGO_FILTER};`
    : "";
  return `<img src='${escapeAttr(src)}' alt="" style="max-width:100%;max-height:${CARD_PRINT_HEIGHT_IN * 0.82}in;width:auto;height:auto;object-fit:contain;object-position:center;display:block;${filter}" />`;
}

function pdfBackLogoHtml(design: ResolvedOrderCardDesign, black = false) {
  const box = logoLayoutBox(design.logoLayout);
  if (!design.logoSrc) return "";
  return `
    <div style="
      position:absolute;
      left:${box.left};
      top:${box.top};
      width:${box.width};
      max-width:102%;
      max-height:${box.maxHeight};
      transform:translate(-50%, -50%);
      z-index:10;
      display:flex;
      align-items:center;
      justify-content:center;
      overflow:hidden;
    ">
      ${pdfLogoImg(design.logoSrc, black)}
    </div>
  `;
}

function pdf2BackPageHtml(design: ResolvedOrderCardDesign) {
  return pdfCardShell(
    nfcIconSvg(PRINT_CARD_INK, 28, { id: "nfc-pdf2-back" }),
    pdfBackLogoHtml(design, false),
  );
}

function pdf3BackPageHtml(design: ResolvedOrderCardDesign) {
  const ink = colorInk(design);
  const gold = isGoldFinish(design);
  const silver = isSilverFinish(design);

  return pdfCardShell(
    nfcIconSvg(ink, 28, { gold, silver, id: "nfc-pdf3-back" }),
    pdfBackLogoHtml(design, false),
    cardFaceBg(design),
  );
}

export {
  CARD_CORNER_RADIUS_IN,
  CARD_PRINT_HEIGHT_IN,
  CARD_PRINT_SIZE_LABEL,
  CARD_PRINT_WIDTH_IN,
} from "@/lib/order-card";

function PreviewDetail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="grid items-start gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]"
    >
      <dt className="pt-0.5 text-[11px] font-bold tracking-[0.12em] text-[#8a8174] uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-[15px] leading-snug font-semibold text-[#141414] break-words">
        {children}
      </dd>
    </div>
  );
}

export function OrderCardPreview({
  order,
  design: designProp,
  showBothSides = true,
}: {
  order: HexaOrder;
  design?: ResolvedOrderCardDesign;
  showBothSides?: boolean;
}) {
  const [design, setDesign] = useState<ResolvedOrderCardDesign>(
    () => designProp ?? buildOrderCardDesign(order),
  );
  const [side, setSide] = useState<"front" | "back">("front");

  useEffect(() => {
    let cancelled = false;
    async function loadDesign() {
      const next = designProp ?? (await buildOrderCardDesignAsync(order));
      if (!cancelled) setDesign(next);
    }
    void loadDesign();
    return () => {
      cancelled = true;
    };
  }, [order, designProp]);

  if (showBothSides) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-center text-[11px] font-bold tracking-[0.14em] text-[#8a8174] uppercase">
              Front side · {CARD_PRINT_SIZE_LABEL}
            </p>
            <CardFace design={design} side="front" />
          </div>
          <div>
            <p className="mb-2 text-center text-[11px] font-bold tracking-[0.14em] text-[#8a8174] uppercase">
              Back side · {CARD_PRINT_SIZE_LABEL}
            </p>
            <CardFace design={design} side="back" />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white">
          <p className="border-b border-black/[0.06] bg-[#FFFCF7] px-4 py-2.5 text-[11px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            Card details
          </p>
          <dl className="divide-y divide-black/[0.06]">
            <PreviewDetail label="Card type">
              {design.cardBody === "black" ? "Black card" : "White card"}
            </PreviewDetail>
            <PreviewDetail label={design.cardBody === "white" ? "Color" : "Finish"}>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: design.accentColor }}
                  aria-hidden
                />
                {printFinishLabel(design)}
              </span>
            </PreviewDetail>
            <PreviewDetail label="Name">{design.name}</PreviewDetail>
            <PreviewDetail label="Title">{design.subtitle || "—"}</PreviewDetail>
            {design.extraLine?.trim() ? (
              <PreviewDetail label="Details">{design.extraLine}</PreviewDetail>
            ) : null}
            <PreviewDetail label="Logo">
              {design.logoSrc ? (
                isPdfLogoSrc(design.logoSrc) ? (
                  <span className="inline-flex flex-wrap items-center gap-2.5">
                    <span className="rounded-md border border-black/[0.08] bg-[#FFFCF7] px-2 py-1 text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
                      PDF
                    </span>
                    <a
                      href={design.logoSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-medium text-[#BC7C10] underline-offset-2 hover:underline"
                    >
                      Open logo PDF
                    </a>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={design.logoSrc}
                      alt=""
                      className="h-8 w-8 rounded-md border border-black/[0.08] bg-[#FFFCF7] object-contain p-0.5"
                    />
                    Uploaded
                  </span>
                )
              ) : (
                "Not uploaded"
              )}
            </PreviewDetail>
            <PreviewDetail label="QR link">
              {order.paymentStatus === "paid" && order.cardSlug?.trim() ? (
                <a
                  href={design.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[13px] font-medium text-[#BC7C10] underline-offset-2 hover:underline"
                >
                  {design.liveUrl}
                </a>
              ) : (
                <span className="text-[13px] text-[#8a8174]">
                  {order.paymentStatus === "failed"
                    ? "Not generated — payment failed"
                    : order.paymentStatus === "pending"
                      ? "Not generated — payment pending"
                      : "Not generated"}
                </span>
              )}
            </PreviewDetail>
          </dl>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2">
        {(["front", "back"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSide(value)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              side === value
                ? "bg-[#BC7C10] text-white"
                : "bg-[#F3F4F6] text-[#5c5346]"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <CardFace design={design} side={side} />
    </div>
  );
}

export function orderLogoPrintHtml(
  order: HexaOrder,
  design?: ResolvedOrderCardDesign,
): string | null {
  const resolved = design ?? buildOrderCardDesign(order);
  if (!resolved.logoSrc) return null;
  if (isPdfLogoSrc(resolved.logoSrc)) {
    return `
    <!DOCTYPE html>
    <html>
      <head><title>Logo — ${escapeHtml(resolved.name)}</title></head>
      <body style="margin:0;min-height:100vh;background:#fff;">
        <embed
          src='${escapeAttr(resolved.logoSrc)}'
          type="application/pdf"
          style="width:100vw;height:100vh;border:0;"
        />
      </body>
    </html>
  `;
  }
  return `
    <!DOCTYPE html>
    <html>
      <head><title>Logo — ${escapeHtml(resolved.name)}</title></head>
      <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;">
        <img
          src='${escapeAttr(resolved.logoSrc)}'
          alt="Uploaded logo"
          style="max-width:98%;max-height:98%;object-fit:contain;object-position:center;display:block;"
        />
      </body>
    </html>
  `;
}

function cardPrintDocument(
  title: string,
  frontHtml: string,
  backHtml: string,
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: ${CARD_PRINT_WIDTH_IN}in ${CARD_PRINT_HEIGHT_IN}in;
            margin: 0;
          }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          img {
            image-rendering: -webkit-optimize-contrast;
            image-rendering: high-quality;
          }
          .card-page {
            width: ${CARD_PRINT_WIDTH_IN}in;
            height: ${CARD_PRINT_HEIGHT_IN}in;
            page-break-after: always;
            overflow: hidden;
          }
          .card-page:last-child {
            page-break-after: auto;
          }
          @media screen {
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.35in;
              padding: 0.35in 0;
            }
          }
        </style>
      </head>
      <body>
        ${frontHtml}
        ${backHtml}
      </body>
    </html>
  `;
}

export function orderCompleteCardPrintHtml(design: ResolvedOrderCardDesign): string {
  return cardPrintDocument(
    `Complete Card — ${design.name}`,
    pdf2FrontPageHtml(design),
    pdf2BackPageHtml(design),
  );
}

export function orderColorCardPrintHtml(design: ResolvedOrderCardDesign): string {
  return cardPrintDocument(
    `Color Card — ${design.name}`,
    pdf3FrontPageHtml(design),
    pdf3BackPageHtml(design),
  );
}

export function printHtmlDocument(html: string, title: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.document.title = title;

  const printWhenReady = () => {
    win.focus();
    win.print();
  };

  const images = Array.from(win.document.images);
  if (images.length === 0) {
    printWhenReady();
    return;
  }

  Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  ).then(() => {
    window.setTimeout(printWhenReady, 50);
  });
}

export function printOrderLogoPdf(order: HexaOrder) {
  void (async () => {
    const design = await buildOrderCardDesignAsync(order);
    if (!design.logoSrc) {
      window.alert("No logo uploaded for this order.");
      return;
    }
    // Native PDF files: open/download the file itself (cannot render in <img>).
    if (isPdfLogoSrc(design.logoSrc)) {
      window.open(design.logoSrc, "_blank", "noopener,noreferrer");
      return;
    }
    const html = orderLogoPrintHtml(order, design);
    if (!html) {
      window.alert("No logo uploaded for this order.");
      return;
    }
    printHtmlDocument(html, `Logo — ${design.name}`);
  })();
}

export function printOrderCompleteCardPdf(order: HexaOrder) {
  void (async () => {
    const design = await buildOrderCardDesignAsync(order);
    let logoSrc = design.logoSrc
      ? (await prepareCardLogoDataUrl(design.logoSrc)) || design.logoSrc
      : undefined;
    if (logoSrc) {
      logoSrc = (await toBlackLogoDataUrl(logoSrc)) || logoSrc;
    }
    printHtmlDocument(
      orderCompleteCardPrintHtml({ ...design, logoSrc }),
      `Complete Card — ${design.name}`,
    );
  })();
}

export function printOrderColorCardPdf(order: HexaOrder) {
  void (async () => {
    const design = await buildOrderCardDesignAsync(order);
    const foil = isGoldFinish(design)
      ? "gold"
      : isSilverFinish(design)
        ? "silver"
        : null;
    const logoSrc = design.logoSrc
      ? (await logoForCardFinish(design.logoSrc, foil)) || design.logoSrc
      : undefined;
    printHtmlDocument(
      orderColorCardPrintHtml({ ...design, logoSrc }),
      `Color Card — ${design.name}`,
    );
  })();
}
