const DB_NAME = "hexaCards";
const DB_VERSION = 1;
const STORE_NAME = "orderLogos";
export const ORDER_LOGO_REF_PREFIX = "idb:order-logo:";

const memoryLogos = new Map<string, string>();

export function orderLogoRef(orderId: string) {
  return `${ORDER_LOGO_REF_PREFIX}${orderId}`;
}

export function isOrderLogoRef(src?: string | null): boolean {
  return Boolean(src?.startsWith(ORDER_LOGO_REF_PREFIX));
}

export function cacheOrderLogo(orderId: string, src: string) {
  if (!orderId || !src.startsWith("data:image/")) return;
  memoryLogos.set(orderId, src);
}

export function getCachedOrderLogo(orderId: string): string | undefined {
  return memoryLogos.get(orderId);
}

function openLogoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function idbPutLogo(orderId: string, src: string) {
  const db = await openLogoDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.objectStore(STORE_NAME).put(src, orderId);
  });
  db.close();
}

async function idbGetLogo(orderId: string): Promise<string | undefined> {
  const db = await openLogoDb();
  const value = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(orderId);
    req.onsuccess = () => {
      const next = req.result;
      resolve(typeof next === "string" && next.startsWith("data:image/") ? next : undefined);
    };
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
  db.close();
  return value;
}

/** Keep logos print-sharp without storing multi-MB PNGs in browser storage. */
export async function compressCardLogoDataUrl(
  src: string,
  maxEdge = 1200,
  maxChars = 280_000,
): Promise<string> {
  if (typeof window === "undefined") return src;
  if (!src.startsWith("data:image/") && !src.startsWith("blob:")) return src;
  if (src.startsWith("data:image/") && src.length <= maxChars) return src;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        resolve(src);
        return;
      }

      const scale = Math.min(1, maxEdge / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const png = canvas.toDataURL("image/png");
      if (png.length <= maxChars) {
        resolve(png);
        return;
      }

      const jpeg = canvas.toDataURL("image/jpeg", 0.86);
      resolve(jpeg.length < src.length ? jpeg : png.length < src.length ? png : src);
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export async function persistOrderLogo(
  orderId: string,
  src: string,
): Promise<string> {
  const compact = await compressCardLogoDataUrl(src);
  cacheOrderLogo(orderId, compact);
  try {
    await idbPutLogo(orderId, compact);
  } catch {
    // Memory cache still keeps the current session preview working.
  }
  return compact;
}

export async function loadOrderLogo(
  orderId: string,
  storedSrc?: string | null,
): Promise<string | undefined> {
  if (storedSrc?.startsWith("data:image/") && storedSrc.length > 80) {
    cacheOrderLogo(orderId, storedSrc);
    void persistOrderLogo(orderId, storedSrc);
    return storedSrc;
  }

  const cached = getCachedOrderLogo(orderId);
  if (cached) return cached;

  try {
    const fromDb = await idbGetLogo(orderId);
    if (fromDb) {
      cacheOrderLogo(orderId, fromDb);
      return fromDb;
    }
  } catch {
    // fall through
  }

  return undefined;
}

export function stripLogoForLocalStorage(
  orderId: string,
  src?: string,
): string | undefined {
  if (!src) return undefined;
  if (isOrderLogoRef(src)) return src;
  if (src.startsWith("data:image/")) {
    cacheOrderLogo(orderId, src);
    void persistOrderLogo(orderId, src);
    return orderLogoRef(orderId);
  }
  return src;
}
