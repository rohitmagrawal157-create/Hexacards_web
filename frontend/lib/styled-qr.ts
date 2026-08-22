import { create as createQr } from "qrcode";

const GOLD_STOPS = [
  { offset: "0%", color: "#9B6F18" },
  { offset: "15%", color: "#C9982C" },
  { offset: "30%", color: "#F7DFA7" },
  { offset: "40%", color: "#FFF3D7" },
  { offset: "55%", color: "#D8A83A" },
  { offset: "72%", color: "#B8841D" },
  { offset: "100%", color: "#D4A133" },
] as const;

const SILVER_STOPS = [
  { offset: "0%", color: "#6E7276" },
  { offset: "15%", color: "#9CA0A4" },
  { offset: "30%", color: "#E6E8EA" },
  { offset: "40%", color: "#FAFBFC" },
  { offset: "55%", color: "#B4B8BC" },
  { offset: "72%", color: "#787D82" },
  { offset: "100%", color: "#A8ACB0" },
] as const;

export type StyledQrOptions = {
  color?: string;
  background?: string;
  gold?: boolean;
  silver?: boolean;
  includeFrame?: boolean;
  gradientId?: string;
};

function inFinder(row: number, col: number, n: number) {
  const inTL = row < 7 && col < 7;
  const inTR = row < 7 && col >= n - 7;
  const inBL = row >= n - 7 && col < 7;
  return inTL || inTR || inBL;
}

function roundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  rx: number,
  fill: string,
) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="${fill}"/>`;
}

function finderEye(x: number, y: number, fill: string, cutout: string) {
  return [
    roundedRect(x, y, 7, 7, 0, fill),
    roundedRect(x + 1, y + 1, 5, 5, 0, cutout),
    roundedRect(x + 2, y + 2, 3, 3, 0, fill),
  ].join("");
}

/** Classic square QR modules + rounded outer frame — used on cards and PDFs. */
export function buildStyledQrSvg(
  data: string,
  options: StyledQrOptions = {},
): string {
  const color = options.color || "#141414";
  const background = options.background || "#FFFFFF";
  const includeFrame = options.includeFrame !== false;
  const gold = Boolean(options.gold);
  const silver = Boolean(options.silver) && !gold;
  const foil = gold || silver;
  const gradientId = options.gradientId || "hexaQrFoil";
  const payload = data.trim() || "https://hexacards.com";

  const qr = createQr(payload, {
    errorCorrectionLevel: "M",
  });
  const n = qr.modules.size;
  const fill = foil ? `url(#${gradientId})` : color;

  const frame = includeFrame ? 0.82 : 0;
  const quiet = includeFrame ? 2.05 : 1.6;
  const origin = frame + quiet;
  const total = n + origin * 2;
  const frameRx = total * 0.1;
  const strokeW = includeFrame ? 0.7 : 0;

  const modules: string[] = [];
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      if (!qr.modules.get(row, col)) continue;
      if (inFinder(row, col, n)) continue;
      modules.push(
        `<rect x="${origin + col}" y="${origin + row}" width="1" height="1" fill="${fill}"/>`,
      );
    }
  }

  const finders = [
    finderEye(origin, origin, fill, background),
    finderEye(origin + n - 7, origin, fill, background),
    finderEye(origin, origin + n - 7, fill, background),
  ].join("");

  const foilStops = gold ? GOLD_STOPS : silver ? SILVER_STOPS : null;
  const defs = foilStops
    ? `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">${foilStops
        .map(
          (stop) =>
            `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`,
        )
        .join("")}</linearGradient></defs>`
    : "";

  const frameShape = includeFrame
    ? `<rect x="${strokeW / 2}" y="${strokeW / 2}" width="${total - strokeW}" height="${total - strokeW}" rx="${frameRx}" ry="${frameRx}" fill="${background}" stroke="${fill}" stroke-width="${strokeW}"/>`
    : `<rect x="0" y="0" width="${total}" height="${total}" rx="${total * 0.08}" ry="${total * 0.08}" fill="${background}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="100%" height="100%" shape-rendering="geometricPrecision">${defs}${frameShape}${modules.join("")}${finders}</svg>`;
}

export function styledQrDataUri(data: string, options: StyledQrOptions = {}) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    buildStyledQrSvg(data, options),
  )}`;
}
