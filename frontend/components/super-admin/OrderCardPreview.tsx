"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  buildOrderCardDesign,
  buildOrderCardDesignAsync,
  logoForCardFinish,
  prepareCardLogoDataUrl,
  printFinishLabel,
  CARD_CORNER_RADIUS_IN,
  CARD_PRINT_HEIGHT_IN,
  CARD_PRINT_SIZE_LABEL,
  CARD_PRINT_WIDTH_IN,
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

function BackLogo({
  src,
  foil,
}: {
  src?: string;
  foil?: "gold" | "silver" | null;
}) {
  const [failed, setFailed] = useState(false);
  const [cleanSrc, setCleanSrc] = useState<string | undefined>(src);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    if (!src) {
      setCleanSrc(undefined);
      return;
    }
    // No foil — render the uploaded logo unchanged.
    if (!foil) {
      setCleanSrc(src);
      return;
    }
    setCleanSrc(src);
    void logoForCardFinish(src, foil).then((next) => {
      if (!cancelled && next) setCleanSrc(next);
    });
    return () => {
      cancelled = true;
    };
  }, [src, foil]);

  const showLogo = Boolean(cleanSrc) && !failed;
  if (!showLogo) return null;

  return (
    <div className="flex h-full w-full items-center justify-center p-[6%]">
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
        <BackLogo src={design.logoSrc} foil={foil} />
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
  if (!src) return "";
  const filter = black
    ? `filter:${BLACK_LOGO_FILTER};-webkit-filter:${BLACK_LOGO_FILTER};`
    : "";
  return `<img src='${escapeAttr(src)}' alt="" style="width:100%;height:100%;object-fit:contain;object-position:center;display:block;${filter}" />`;
}

function pdf2BackPageHtml(design: ResolvedOrderCardDesign) {
  return pdfCardShell(
    nfcIconSvg(PRINT_CARD_INK, 28, { id: "nfc-pdf2-back" }),
    `
      <div style="
        position:absolute;
        inset:0.14in;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
      ">
        ${pdfLogoImg(design.logoSrc, true)}
      </div>
    `,
  );
}

function pdf3BackPageHtml(design: ResolvedOrderCardDesign) {
  const ink = colorInk(design);
  const gold = isGoldFinish(design);
  const silver = isSilverFinish(design);

  return pdfCardShell(
    nfcIconSvg(ink, 28, { gold, silver, id: "nfc-pdf3-back" }),
    `
      <div style="
        position:absolute;
        inset:0.14in;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
      ">
        ${pdfLogoImg(design.logoSrc)}
      </div>
    `,
    cardFaceBg(design),
  );
}

export {
  CARD_CORNER_RADIUS_IN,
  CARD_PRINT_HEIGHT_IN,
  CARD_PRINT_SIZE_LABEL,
  CARD_PRINT_WIDTH_IN,
} from "@/lib/order-card";

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
            <p className="mb-2 text-center text-[10px] font-bold tracking-[0.14em] text-[#8a8174] uppercase">
              Front side · {CARD_PRINT_SIZE_LABEL}
            </p>
            <CardFace design={design} side="front" />
          </div>
          <div>
            <p className="mb-2 text-center text-[10px] font-bold tracking-[0.14em] text-[#8a8174] uppercase">
              Back side · {CARD_PRINT_SIZE_LABEL}
            </p>
            <CardFace design={design} side="back" />
          </div>
        </div>
        <div className="rounded-xl border border-black/[0.06] bg-[#FFFCF7] p-3 text-xs text-[#5c5346]">
          <p>
            <span className="font-semibold text-[#141414]">Card type:</span>{" "}
            {design.cardBody === "black" ? "Black card" : "White card"}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-[#141414]">
              {design.cardBody === "white" ? "Color:" : "Finish:"}
            </span>{" "}
            {printFinishLabel(design)}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-[#141414]">Name:</span>{" "}
            {design.name}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-[#141414]">Title:</span>{" "}
            {design.subtitle}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-[#141414]">Logo:</span>{" "}
            {design.logoSrc ? "Uploaded" : "Not uploaded"}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-[#141414]">QR links to:</span>{" "}
            <span className="break-all font-mono text-[11px]">{design.liveUrl}</span>
          </p>
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
  win.focus();
  win.print();
}

export function printOrderLogoPdf(order: HexaOrder) {
  void (async () => {
    const design = await buildOrderCardDesignAsync(order);
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
    const logoSrc = design.logoSrc
      ? (await prepareCardLogoDataUrl(design.logoSrc)) || design.logoSrc
      : undefined;
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
