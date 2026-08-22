import { getOrderById, updateOrder, type HexaOrder } from "@/lib/orders";
import { isDefaultLogoImage } from "@/lib/card-profile";
import { blobUrlToDataUrl } from "@/lib/user-cards";
import { getCachedOrderLogo, isOrderLogoRef, loadOrderLogo } from "@/lib/order-logo-store";
import { styledQrDataUri } from "@/lib/styled-qr";

export type CardBodyType = "black" | "white";
export type CardMetalFinish = "gold" | "silver";

export type OrderCardLogoLayout = {
  size: number;
  x: number;
  y: number;
};

/** Full card design saved at checkout from the card customizer */
export type OrderCardDesignData = {
  cardBody: CardBodyType;
  finish: CardMetalFinish;
  cardColor: string;
  accentColor: string;
  /**
   * Color chosen in Card Customizer at checkout — never overwritten by
   * dashboard Appearance edits.
   */
  lockedAccentColor?: string;
  /** Name / title on front */
  name: string;
  /** Subtitle on front */
  subtitle: string;
  /** Optional extra line on front */
  extraLine?: string;
  /** User-uploaded logo — back side (data URL or public path) */
  logoSrc?: string;
  logoLayout?: OrderCardLogoLayout;
  liveUrl?: string;
};

export type ResolvedOrderCardDesign = OrderCardDesignData & {
  slug: string;
  liveUrl: string;
  qrUrl: string;
};

/** Print / PDF 2 card size — 3.7 × 2.12 inches */
export const CARD_PRINT_WIDTH_IN = 3.7;
export const CARD_PRINT_HEIGHT_IN = 2.12;
export const CARD_CORNER_RADIUS_IN = 0.12;
export const CARD_PRINT_SIZE_LABEL = `${CARD_PRINT_WIDTH_IN} × ${CARD_PRINT_HEIGHT_IN} in`;

function isUsableLogoSrc(src?: string | null): src is string {
  if (!src?.trim()) return false;
  if (src.startsWith("blob:")) return false;
  if (isOrderLogoRef(src)) return false;
  if (isDefaultLogoImage(src)) return false;
  if (src.startsWith("data:image/")) return src.length > 80;
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/") ||
    src.startsWith("data:")
  );
}

function pickStaticLogoSrc(
  ...candidates: (string | undefined | null)[]
): string | undefined {
  for (const candidate of candidates) {
    if (isUsableLogoSrc(candidate)) return candidate;
  }
  return undefined;
}

/** Resolve a printable logo — data URL, path, or convert expired blob URLs */
export async function resolveOrderLogoSrc(
  order: HexaOrder,
): Promise<string | undefined> {
  const stored = order.cardDesign?.logoSrc;
  const fromStore = await loadOrderLogo(order.id, stored);
  if (fromStore) return fromStore;

  const staticSrc = pickStaticLogoSrc(stored);
  if (staticSrc) return staticSrc;

  // Standee / social-media orders store the logo in orderLogoSrc
  if (order.orderLogoSrc) return order.orderLogoSrc;

  const blobCandidates = [order.cardDesign?.logoSrc].filter(
    (src): src is string => Boolean(src?.startsWith("blob:")),
  );

  for (const blob of blobCandidates) {
    try {
      const dataUrl = await blobUrlToDataUrl(blob);
      if (order.cardDesign) {
        updateOrder(order.id, {
          cardDesign: { ...order.cardDesign, logoSrc: dataUrl },
        });
      }
      return dataUrl;
    } catch {
      // try next source
    }
  }

  return undefined;
}

type LogoPixel = { r: number; g: number; b: number; a: number };

function readLogoPixel(data: Uint8ClampedArray, i: number): LogoPixel {
  return {
    r: data[i],
    g: data[i + 1],
    b: data[i + 2],
    a: data[i + 3],
  };
}

function logoPixelLuminance({ r, g, b }: LogoPixel) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function logoPixelSaturation({ r, g, b }: LogoPixel) {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  return maxC === 0 ? 0 : (maxC - minC) / maxC;
}

function pixelIndex(x: number, y: number, width: number) {
  return (y * width + x) * 4;
}

function isWhitePaper(pixel: LogoPixel) {
  if (pixel.a < 8) return true;
  const lum = logoPixelLuminance(pixel);
  const sat = logoPixelSaturation(pixel);
  return lum > 236 && sat < 0.12;
}

/** Looser paper detection for foil prep — clears JPEG mats and grey halos. */
function isPaperBackdrop(pixel: LogoPixel) {
  if (pixel.a < 8) return true;
  const lum = logoPixelLuminance(pixel);
  const sat = logoPixelSaturation(pixel);
  return lum > 168 && sat < 0.14;
}

function isBlackBox(pixel: LogoPixel) {
  if (pixel.a < 8) return true;
  const lum = logoPixelLuminance(pixel);
  const sat = logoPixelSaturation(pixel);
  return lum < 28 && sat < 0.18;
}

function sampleCornerBackdrop(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): "white" | "black" | null {
  const corners = [
    readLogoPixel(data, pixelIndex(0, 0, width)),
    readLogoPixel(data, pixelIndex(width - 1, 0, width)),
    readLogoPixel(data, pixelIndex(0, height - 1, width)),
    readLogoPixel(data, pixelIndex(width - 1, height - 1, width)),
  ];
  const whiteHits = corners.filter(isWhitePaper).length;
  const blackHits = corners.filter(isBlackBox).length;
  if (whiteHits >= 3) return "white";
  if (blackHits >= 3) return "black";
  return null;
}

/**
 * Knock out only the outer paper / JPEG box connected to the edges.
 * Never erase interior artwork — including black taglines and fine type.
 */
function punchEdgeBackdrop(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const mode = sampleCornerBackdrop(data, width, height);
  if (!mode) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) data[i + 3] = 0;
    }
    return;
  }

  const matches = mode === "white" ? isWhitePaper : isBlackBox;
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx]) return;
    const pixel = readLogoPixel(data, pixelIndex(x, y, width));
    if (!matches(pixel)) return;
    seen[idx] = 1;
    stack.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (stack.length) {
    const idx = stack.pop()!;
    const x = idx % width;
    const y = (idx / width) | 0;
    data[idx * 4 + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hasSaturatedNeighbor(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 4,
  minSat = 0.16,
) {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const pixel = readLogoPixel(data, pixelIndex(nx, ny, width));
      if (pixel.a < 20) continue;
      if (logoPixelSaturation(pixel) >= minSat) return true;
    }
  }
  return false;
}

function hasArtworkInkNeighbor(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 5,
) {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const pixel = readLogoPixel(data, pixelIndex(nx, ny, width));
      if (pixel.a < 16) continue;
      const lum = logoPixelLuminance(pixel);
      const sat = logoPixelSaturation(pixel);
      if (sat > 0.1 || lum < 88) return true;
    }
  }
  return false;
}

function isSourceInkPixel(pixel: LogoPixel) {
  if (pixel.a < 8) return false;
  const lum = logoPixelLuminance(pixel) / 255;
  const sat = logoPixelSaturation(pixel);
  return lum < 0.74 || sat > 0.05;
}

function isGreyMat(pixel: LogoPixel) {
  if (pixel.a < 12) return false;
  const lum = logoPixelLuminance(pixel);
  const sat = logoPixelSaturation(pixel);
  return lum > 90 && lum < 198 && sat < 0.12;
}

/** Remove interior white mats (not part of colored artwork) before foil. */
function punchWhiteMatForFoil(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = pixelIndex(x, y, width);
      const pixel = readLogoPixel(data, i);
      if (!isPaperBackdrop(pixel)) continue;
      if (hasArtworkInkNeighbor(data, x, y, width, height)) continue;
      data[i + 3] = 0;
    }
  }
}

/** Remove flat grey JPEG halos that create a visible box on foil cards. */
function punchGreyMatForFoil(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = pixelIndex(x, y, width);
      const pixel = readLogoPixel(data, i);
      if (!isGreyMat(pixel)) continue;
      if (hasArtworkInkNeighbor(data, x, y, width, height)) continue;
      data[i + 3] = 0;
    }
  }
}

/** Remove black JPEG boxes / frames connected to the image edge. */
function punchEdgeConnectedBlack(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx]) return;
    const pixel = readLogoPixel(data, pixelIndex(x, y, width));
    if (!isBlackBox(pixel)) return;
    seen[idx] = 1;
    stack.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (stack.length) {
    const idx = stack.pop()!;
    const x = idx % width;
    const y = (idx / width) | 0;
    data[idx * 4 + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
}

function logoContentBounds(data: Uint8ClampedArray, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[pixelIndex(x, y, width) + 3] < 12) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

/** Drop thin black rectangle frames — never remove text rows with letter gaps. */
function punchThinPerimeterFrame(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const bounds = logoContentBounds(data, width, height);
  if (!bounds) return;
  const { minX, minY, maxX, maxY } = bounds;
  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  if (spanX < 12 || spanY < 12) return;

  const maxThickness = Math.max(3, Math.round(Math.min(spanX, spanY) * 0.035));

  const lineDarkStats = (fixed: number, horizontal: boolean) => {
    let dark = 0;
    let gaps = 0;
    let inGap = false;
    const len = horizontal ? spanX : spanY;
    for (let step = 0; step < len; step += 1) {
      const x = horizontal ? minX + step : fixed;
      const y = horizontal ? fixed : minY + step;
      const pixel = readLogoPixel(data, pixelIndex(x, y, width));
      const isDark =
        pixel.a >= 12 &&
        (isBlackBox(pixel) || logoPixelLuminance(pixel) < 72);
      if (isDark) {
        dark += 1;
        inGap = false;
        continue;
      }
      if (pixel.a < 12) {
        if (!inGap) gaps += 1;
        inGap = true;
      }
    }
    return { dark, gaps, len };
  };

  const isSolidFrameLine = (fixed: number, horizontal: boolean) => {
    const { dark, gaps, len } = lineDarkStats(fixed, horizontal);
    return dark / len > 0.8 && gaps < 4;
  };

  const clearIfFrameLine = (x: number, y: number, horizontal: boolean) => {
    const i = pixelIndex(x, y, width);
    const pixel = readLogoPixel(data, i);
    if (pixel.a < 12) return;
    if (!isBlackBox(pixel) && logoPixelLuminance(pixel) >= 72) return;
    const fixed = horizontal ? y : x;
    if (!isSolidFrameLine(fixed, horizontal)) return;
    data[i + 3] = 0;
  };

  for (let t = 0; t < maxThickness; t += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      clearIfFrameLine(x, minY + t, true);
      clearIfFrameLine(x, maxY - t, true);
    }
    for (let y = minY; y <= maxY; y += 1) {
      clearIfFrameLine(minX + t, y, false);
      clearIfFrameLine(maxX - t, y, false);
    }
  }
}

function prepareLogoMaskForFoil(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  punchWhiteMatForFoil(data, width, height);
  punchGreyMatForFoil(data, width, height);
  punchEdgeConnectedBlack(data, width, height);
  punchThinPerimeterFrame(data, width, height);
  defringeLogoData(data);
}

/**
 * Only run the bottom-tagline restoration on logos that actually contain
 * multi-line text in the lower area.
 *
 * Monogram-style logos (like the AS case) don't need this pass and it can
 * reintroduce the rectangular frame artifact.
 */
function shouldRestoreBottomTaglines(
  source: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const xStep = width > 700 ? 3 : 2;
  const densities = new Uint32Array(height);

  let max = 0;
  for (let y = 0; y < height; y += 1) {
    let count = 0;
    for (let x = 0; x < width; x += xStep) {
      const i = pixelIndex(x, y, width);
      const px = readLogoPixel(source, i);
      if (isSourceInkPixel(px)) count += 1;
    }
    densities[y] = count;
    if (count > max) max = count;
  }

  const threshold = Math.max(6, Math.floor(max * 0.22));
  const segments: Array<{ start: number; end: number }> = [];
  let inSeg = false;
  let start = 0;

  for (let y = 0; y < height; y += 1) {
    const active = densities[y] > threshold;
    if (active && !inSeg) {
      inSeg = true;
      start = y;
    } else if (!active && inSeg) {
      inSeg = false;
      segments.push({ start, end: y - 1 });
    }
  }
  if (inSeg) segments.push({ start, end: height - 1 });

  // Need at least 2 separate ink bands: top logo + bottom tagline.
  if (segments.length < 2) return false;

  const mid = Math.floor(height * 0.55);
  const hasTop = segments.some((s) => s.end < mid);
  const hasBottom = segments.some(
    (s) => s.start > mid && s.end - s.start >= 2,
  );

  return hasTop && hasBottom;
}

/** Bring back thin taglines removed by backdrop / frame passes. */
function restoreLostFineInk(
  data: Uint8ClampedArray,
  source: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const bounds = logoContentBounds(source, width, height);
  if (!bounds) return;
  const { minX, maxX, minY, maxY } = bounds;
  const taglineStart = minY + Math.floor((maxY - minY) * 0.62);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const i = pixelIndex(x, y, width);
      const src = readLogoPixel(source, i);
      if (!isSourceInkPixel(src)) continue;
      const cur = readLogoPixel(data, i);
      const isTaglineRow = y >= taglineStart;
      if (!isTaglineRow && cur.a >= 64) continue;

      data[i] = src.r;
      data[i + 1] = src.g;
      data[i + 2] = src.b;
      data[i + 3] = clampChannel(Math.max(cur.a, src.a, isTaglineRow ? 230 : 180));
    }
  }
}

/** Lift thin strokes, small type, and bottom taglines before foil tint. */
function boostFineInkForFoil(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const bounds = logoContentBounds(data, width, height);
  if (!bounds) return;
  const taglineStart = bounds.minY + Math.floor((bounds.maxY - bounds.minY) * 0.62);

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const i = pixelIndex(x, y, width);
      const pixel = readLogoPixel(data, i);
      if (pixel.a < 6) continue;

      const lum = logoPixelLuminance(pixel) / 255;
      const sat = logoPixelSaturation(pixel);
      const isTaglineRow = y >= taglineStart;
      const isFineInk = lum < 0.62 || (sat > 0.04 && lum < 0.78);

      if (!isFineInk && !isTaglineRow) continue;

      if (pixel.a < 240) {
        const lift = isTaglineRow ? 1.45 : lum < 0.35 ? 1.32 : 1.18;
        data[i + 3] = clampChannel(Math.min(255, pixel.a * lift + (isTaglineRow ? 28 : 12)));
      }

      if (lum < 0.72) {
        const target = Math.min(0.94, lum + (isTaglineRow ? 0.34 : 0.22) + sat * 0.16);
        const scale = lum > 0.001 ? target / lum : 1;
        data[i] = clampChannel(pixel.r * scale);
        data[i + 1] = clampChannel(pixel.g * scale);
        data[i + 2] = clampChannel(pixel.b * scale);
      }
    }
  }
}

function sharpenFoilAlpha(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 10) {
      data[i + 3] = 0;
      continue;
    }
    if (alpha > 72) {
      data[i + 3] = 255;
      continue;
    }
    data[i + 3] = clampChannel(alpha * 1.55);
  }
}

function isLogoInkPixel(pixel: LogoPixel) {
  if (pixel.a < 6) return false;
  if (isPaperBackdrop(pixel) || isGreyMat(pixel) || isBlackBox(pixel)) return false;
  const lum = logoPixelLuminance(pixel) / 255;
  const sat = logoPixelSaturation(pixel);
  // On uploaded logos, leftover black frames/mats can survive cleanup.
  // Those should never get foiled as "ink".
  return sat > 0.04 || lum > 0.15;
}

/** Remove white/grey JPEG halos on soft edges — keeps interior artwork intact. */
function defringeLogoData(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0 || alpha === 255) continue;

    const pixel = readLogoPixel(data, i);
    const lum = logoPixelLuminance(pixel) / 255;
    const sat = logoPixelSaturation(pixel);

    if (lum > 0.9 && sat < 0.14) {
      data[i + 3] = 0;
      continue;
    }

    if (lum > 0.78 && sat < 0.22 && alpha < 235) {
      const fringe = ((lum - 0.78) / 0.22) * (1 - alpha / 255);
      data[i + 3] = clampChannel(alpha * (1 - fringe * 0.95));
    }
  }
}

/** Lift thin strokes and small type so they survive foil conversion. */
function strengthenFineLogoDetails(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 8) continue;

    const pixel = readLogoPixel(data, i);
    const lum = logoPixelLuminance(pixel) / 255;
    const sat = logoPixelSaturation(pixel);
    const ink = sat > 0.16 ? lum * 0.45 + sat * 0.55 : lum;

    if (ink > 0.04 && ink < 0.78 && alpha < 252) {
      const lift =
        ink < 0.5
          ? 1.24 + (0.5 - ink) * 0.42
          : 1.08 + (0.55 - ink) * 0.18;
      data[i + 3] = clampChannel(Math.min(255, alpha * lift));
    }

    if (sat > 0.05 && lum < 0.7) {
      const target = Math.min(0.9, lum + 0.24 + sat * 0.2);
      const scale = lum > 0.001 ? target / lum : 1;
      data[i] = clampChannel(pixel.r * scale);
      data[i + 1] = clampChannel(pixel.g * scale);
      data[i + 2] = clampChannel(pixel.b * scale);
      continue;
    }

    if (ink < 0.82) {
      const contrast = Math.min(1, Math.max(0, (ink - 0.5) * 1.28 + 0.5));
      const boosted = 0.5 + (contrast - 0.5) * 1.22;
      const next = lum + (boosted - lum) * 0.55;
      const scale = lum > 0.001 ? next / lum : 1;
      data[i] = clampChannel(data[i] * scale);
      data[i + 1] = clampChannel(data[i + 1] * scale);
      data[i + 2] = clampChannel(data[i + 2] * scale);
    }
  }
}

function logoInkStrength(r: number, g: number, b: number) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const sat = logoPixelSaturation({ r, g, b, a: 255 });
  let colorful = sat > 0.14 ? lum * 0.42 + sat * 0.58 : lum;
  if (sat > 0.04 && lum < 0.68) {
    colorful = Math.max(colorful, 0.58 + sat * 0.34);
  }
  if (lum < 0.28) {
    colorful = Math.max(colorful, 0.52);
  }
  return Math.min(1, Math.max(0, Math.pow(colorful, 0.62)));
}

function foilGradientAt(
  finish: LogoFoilFinish,
  x: number,
  y: number,
  width: number,
  height: number,
): [number, number, number] {
  const tx = width <= 1 ? 0 : x / (width - 1);
  const ty = height <= 1 ? 0 : y / (height - 1);
  return foilGradientColorAt(finish, tx * 0.68 + ty * 0.32);
}

function applyFoilTintToLogoData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  finish: LogoFoilFinish,
) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const pixel = readLogoPixel(data, i);
      if (!isLogoInkPixel(pixel)) {
        data[i + 3] = 0;
        continue;
      }

      const ink = logoInkStrength(pixel.r, pixel.g, pixel.b);
      let [fr, fg, fb] = foilGradientAt(finish, x, y, width, height);

      let shade = Math.max(ink < 0.55 ? 0.72 : 0.62, 0.36 + ink * 0.64);
      const sat = logoPixelSaturation(pixel);

      if (sat > 0.1) {
        if (pixel.r > pixel.b * 1.1) {
          fr = clampChannel(fr * 1.06 + 16);
          fg = clampChannel(fg * 1.03 + 10);
          shade = Math.max(shade, 0.7);
        } else if (pixel.b > pixel.r * 1.08) {
          fb = clampChannel(fb * 1.08 + 18);
          fr = clampChannel(fr * 0.94 + 10);
          shade = Math.max(shade, 0.74);
        }
      }

      const shine =
        ink > 0.68 ? (ink - 0.68) * 2.8 : ink > 0.32 ? 0.1 + ink * 0.08 : 0.04;
      data[i] = clampChannel(fr * shade + 255 * shine * 0.46);
      data[i + 1] = clampChannel(fg * shade + 255 * shine * 0.46);
      data[i + 2] = clampChannel(fb * shade + 255 * shine * 0.46);
      data[i + 3] = 255;
    }
  }
}

/** Keep every logo mark; only the outer backdrop becomes transparent. */
export async function prepareCardLogoDataUrl(
  src: string,
): Promise<string | undefined> {
  if (typeof window === "undefined") return src;
  if (!src.startsWith("data:image/") && !src.startsWith("blob:") && !src.startsWith("http")) {
    return src;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        resolve(src);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const image = ctx.getImageData(0, 0, width, height);
      punchEdgeBackdrop(image.data, width, height);
      defringeLogoData(image.data);
      ctx.putImageData(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(undefined);
    img.src = src;
  });
}

export type LogoFoilFinish = "gold" | "silver";

const LOGO_FOIL_STOPS: Record<LogoFoilFinish, readonly { offset: number; color: string }[]> = {
  gold: [
    { offset: 0, color: "#C9982C" },
    { offset: 0.18, color: "#E8C56A" },
    { offset: 0.38, color: "#FFF3D7" },
    { offset: 0.55, color: "#D8A83A" },
    { offset: 0.78, color: "#C9982C" },
    { offset: 1, color: "#E4B84A" },
  ],
  silver: [
    { offset: 0, color: "#C5C9CD" },
    { offset: 0.18, color: "#E8EAEC" },
    { offset: 0.38, color: "#FFFFFF" },
    { offset: 0.55, color: "#D0D4D8" },
    { offset: 0.78, color: "#B8BCC0" },
    { offset: 1, color: "#DEE1E4" },
  ],
};

function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.padEnd(6, "0").slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function foilGradientColorAt(
  finish: LogoFoilFinish,
  t: number,
): [number, number, number] {
  const stops = LOGO_FOIL_STOPS[finish];
  if (stops.length === 0) return [200, 200, 200];
  if (t <= stops[0].offset) return hexToRgb(stops[0].color);
  if (t >= stops[stops.length - 1].offset) {
    return hexToRgb(stops[stops.length - 1].color);
  }

  for (let i = 1; i < stops.length; i += 1) {
    const left = stops[i - 1];
    const right = stops[i];
    if (t > right.offset) continue;
    const span = Math.max(0.0001, right.offset - left.offset);
    const local = (t - left.offset) / span;
    const [lr, lg, lb] = hexToRgb(left.color);
    const [rr, rg, rb] = hexToRgb(right.color);
    return [
      clampChannel(lerp(lr, rr, local)),
      clampChannel(lerp(lg, rg, local)),
      clampChannel(lerp(lb, rb, local)),
    ];
  }
  return hexToRgb(stops[stops.length - 1].color);
}

/** Prepare backdrop then tint the logo to the selected gold or silver foil — full size kept. */
export async function logoForCardFinish(
  src: string,
  finish?: LogoFoilFinish | null,
): Promise<string | undefined> {
  const cleaned = await prepareCardLogoDataUrl(src);
  if (!cleaned) return undefined;
  if (!finish) return cleaned;
  if (typeof window === "undefined") return cleaned;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        resolve(cleaned);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(cleaned);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const image = ctx.getImageData(0, 0, width, height);
      const d = image.data;

      // The input is already cleaned by prepareCardLogoDataUrl:
      // white/black edge backdrop is transparent, only logo ink remains.
      // Simply tint every opaque pixel with the foil gradient.
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          const a = d[i + 3];
          if (a < 10) { d[i + 3] = 0; continue; }

          const ty = height <= 1 ? 0 : y / (height - 1);
          const tx = width <= 1 ? 0 : x / (width - 1);
          const t = tx * 0.55 + ty * 0.45;
          const [fr, fg, fb] = foilGradientColorAt(finish, t);

          // Use original luminance for depth — dark ink gets rich foil,
          // light edges get brighter highlights
          const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
          const inkVal = Math.min(1, Math.max(0, 1 - lum));
          const shade = 0.58 + inkVal * 0.42;
          const shine = inkVal > 0.65 ? (inkVal - 0.65) * 1.4 : 0;

          d[i]     = clampChannel(fr * shade + 255 * shine * 0.28);
          d[i + 1] = clampChannel(fg * shade + 255 * shine * 0.28);
          d[i + 2] = clampChannel(fb * shade + 255 * shine * 0.28);
          d[i + 3] = a;
        }
      }

      ctx.putImageData(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(cleaned);
    img.src = cleaned;
  });
}

/** Flatten uploaded logo to a sharp black mark on a transparent background */
export async function toBlackLogoDataUrl(
  src: string,
): Promise<string | undefined> {
  if (typeof window === "undefined") return src;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        resolve(src);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const image = ctx.getImageData(0, 0, width, height);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (alpha < 18 || lum > 242) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
          continue;
        }
        data[i] = 20;
        data[i + 1] = 20;
        data[i + 2] = 20;
        data[i + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(undefined);
    img.src = src;
  });
}

export async function buildOrderCardDesignAsync(
  order: HexaOrder,
): Promise<ResolvedOrderCardDesign> {
  if (order.cardDesign && !order.cardDesign.lockedAccentColor?.trim()) {
    updateOrder(order.id, {
      cardDesign: {
        ...order.cardDesign,
        lockedAccentColor: order.cardDesign.accentColor,
      },
    });
  }
  const design = buildOrderCardDesign(getOrderById(order.id) ?? order);
  const logoSrc = await resolveOrderLogoSrc(getOrderById(order.id) ?? order);
  return { ...design, logoSrc: logoSrc || undefined };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Card URL slug from name + phone — e.g. faizan-shaikh77 */
export function buildCardSlugFromName(
  name: string,
  phone: string,
  orderId?: string,
) {
  const base = slugify(name) || "hexa-card";
  const phoneTail = phone.replace(/\D/g, "").slice(-2);
  if (orderId) {
    const orderTail = orderId.replace(/\D/g, "").slice(-2);
    return `${base}${phoneTail}${orderTail}`;
  }
  return `${base}${phoneTail}`;
}

/** Unique public slug for an order — name + phone + order id tails */
export function buildOrderCardSlug(
  name: string,
  phone: string,
  orderId: string,
) {
  return buildCardSlugFromName(name, phone, orderId);
}

function slugFromUrl(url?: string | null): string {
  if (!url?.trim()) return "";
  const raw = url.trim();
  try {
    const path = raw.includes("://") ? new URL(raw).pathname : raw;
    return path.replace(/^\/+|\/+$/g, "").split("/")[0]?.toLowerCase() ?? "";
  } catch {
    return raw.replace(/^\/+|\/+$/g, "").split("/")[0]?.toLowerCase() ?? "";
  }
}

function orderName(order: HexaOrder): string {
  return order.cardDesign?.name?.trim() || order.customerName || "Your Name";
}

function orderPublicSlug(order: HexaOrder): string {
  return (
    order.cardSlug?.trim() ||
    buildOrderCardSlug(orderName(order), order.phone, order.id)
  );
}

/** Find order for a public card URL slug — supports stored, computed, and legacy slugs */
export function findOrderByPublicSlug(
  slug: string,
  orders: HexaOrder[],
): HexaOrder | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const exact = orders.filter((order) => {
    const candidates = [
      order.cardSlug,
      slugFromUrl(order.cardUrl),
      slugFromUrl(order.cardDesign?.liveUrl),
      orderPublicSlug(order),
      buildCardSlugFromName(orderName(order), order.phone),
    ]
      .map((value) => value?.trim().toLowerCase())
      .filter(Boolean);
    return candidates.includes(normalized);
  });
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    return (
      exact.find((order) => order.cardSlug?.trim().toLowerCase() === normalized) ??
      exact[0]
    );
  }

  const prefixMatches = orders.filter((order) => {
    const full = orderPublicSlug(order).toLowerCase();
    const short = buildCardSlugFromName(orderName(order), order.phone).toLowerCase();
    return (
      full.startsWith(normalized) ||
      normalized.startsWith(full) ||
      short === normalized ||
      full.startsWith(`${normalized}`)
    );
  });
  if (prefixMatches.length === 1) return prefixMatches[0];

  return null;
}

export function resolveOrderLiveUrl(order: HexaOrder): {
  slug: string;
  liveUrl: string;
} {
  const name = orderName(order);
  const slug = orderPublicSlug(order);
  const liveUrl =
    order.cardUrl?.trim() ||
    order.cardDesign?.liveUrl?.trim() ||
    `https://hexacards.com/${slug}`;
  return { slug, liveUrl };
}

/** Styled dotted QR — used by dashboard and any image-based QR preview */
export function buildCardQrImageUrl(
  liveUrl: string,
  _size = 400,
  moduleColor = "141414",
) {
  const hex = moduleColor.replace("#", "").replace(/^0x/i, "") || "141414";
  return styledQrDataUri(liveUrl, {
    color: `#${hex}`,
    includeFrame: true,
  });
}

function hexLuminance(hex: string) {
  const raw = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** QR module color with enough contrast on white */
export function qrModuleColor(accent: string, gold = false) {
  if (gold) return "9B6F18";
  const lum = hexLuminance(accent);
  if (lum > 165) return "141414";
  return accent.replace("#", "");
}

function finishColors(finish: CardMetalFinish) {
  return finish === "silver"
    ? { accentColor: "#C0C0C0" }
    : { accentColor: "#BC7C10" };
}

function bodyColor(cardBody: CardBodyType): string {
  return cardBody === "white" ? "#FFFFFF" : "#141414";
}

const PRINT_ACCENT_LABELS: { hex: string; label: string }[] = [
  { hex: "#C9982C", label: "Gold" },
  { hex: "#BC7C10", label: "Gold" },
  { hex: "#141414", label: "Black" },
  { hex: "#E53935", label: "Red" },
  { hex: "#00B813", label: "Green" },
  { hex: "#FF8E00", label: "Orange" },
  { hex: "#C2185B", label: "Dark Pink" },
  { hex: "#1565C0", label: "Royal Blue" },
  { hex: "#7CB342", label: "Light Green" },
  { hex: "#FDD835", label: "Yellow" },
  { hex: "#00BFFF", label: "Sky Blue" },
  { hex: "#FD0095", label: "Hot Pink" },
  { hex: "#C0C0C0", label: "Silver" },
  { hex: "#9CA0A4", label: "Silver" },
];

export function accentColorLabel(hex?: string) {
  const normalized = (hex || "").trim().toUpperCase();
  if (!normalized) return "Custom";
  return (
    PRINT_ACCENT_LABELS.find((row) => row.hex.toUpperCase() === normalized)
      ?.label ?? "Custom"
  );
}

/** Shown in admin preview — metal finish on black cards, accent name on white cards */
export function printFinishLabel(design: {
  cardBody: CardBodyType;
  finish: CardMetalFinish;
  accentColor: string;
}) {
  if (design.cardBody === "black") {
    return design.finish === "silver" ? "Silver" : "Gold";
  }
  return accentColorLabel(design.accentColor);
}

export function buildOrderCardDesign(order: HexaOrder): ResolvedOrderCardDesign {
  const { slug, liveUrl } = resolveOrderLiveUrl(order);

  const cardBody = order.cardDesign?.cardBody ?? "black";
  const finish = order.cardDesign?.finish ?? "gold";
  const preset = finishColors(finish);
  const locked =
    order.cardDesign?.lockedAccentColor?.trim() ||
    order.cardDesign?.accentColor?.trim() ||
    preset.accentColor;
  const accentColor = locked;
  const cardColor = order.cardDesign?.cardColor?.trim() || bodyColor(cardBody);

  // High-res source for sharp print/PDF; same URL as dashboard QR modal
  const qrUrl = buildCardQrImageUrl(liveUrl, 400);

  return {
    cardBody,
    finish,
    cardColor,
    accentColor,
    name:
      order.cardDesign?.name?.trim() ||
      order.customerName ||
      "Your Name",
    subtitle:
      order.cardDesign?.subtitle?.trim() ||
      order.jobTitle?.trim() ||
      "Title or company",
    extraLine:
      order.cardDesign?.extraLine?.trim() ||
      order.phone ||
      undefined,
    logoSrc:
      getCachedOrderLogo(order.id) ||
      pickStaticLogoSrc(order.cardDesign?.logoSrc) ||
      order.orderLogoSrc ||
      undefined,
    logoLayout: order.cardDesign?.logoLayout ?? { size: 120, x: 0, y: 0 },
    slug,
    liveUrl,
    qrUrl,
  };
}

/** Placeholder logo for sample orders without an upload */
export const SAMPLE_LOGO_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="none"/>
  <path d="M100 28 L172 68 V132 L100 172 L28 132 V68 Z" fill="none" stroke="#BC7C10" stroke-width="8"/>
  <text x="100" y="112" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#BC7C10">H</text>
</svg>`);
