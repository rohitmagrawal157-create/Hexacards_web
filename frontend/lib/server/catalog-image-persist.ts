import type { ProductMedia } from "@/lib/product-catalog";
import type { ProductWriteBody } from "@/lib/server/catalog-types";
import {
  sanitizeCardUsername,
  saveCardImage,
} from "@/lib/server/card-image-storage";

function bareUrl(url: string): string {
  return url.split("?")[0] || url;
}

async function persistDataUrl(
  dataUrl: string,
  key: string,
): Promise<string> {
  const saved = await saveCardImage({
    username: sanitizeCardUsername(key),
    kind: "offer-banner",
    dataUrl,
  });
  return bareUrl(saved.path || saved.url);
}

/**
 * Convert admin data-URL uploads into stored public URLs before writing
 * to products.product_img (varchar 255) / media jsonb.
 */
export async function materializeProductWriteBody(
  body: ProductWriteBody,
  productKey: string,
): Promise<ProductWriteBody> {
  const base = sanitizeCardUsername(productKey || "product") || "product";
  let n = 0;
  const nextKey = () => `${base}-${++n}`;

  const out: ProductWriteBody = { ...body };

  const imageRaw =
    out.imageSrc !== undefined
      ? out.imageSrc
      : out.productImg !== undefined
        ? out.productImg
        : out.product_img !== undefined
          ? out.product_img
          : out.image_src;

  if (typeof imageRaw === "string" && imageRaw.startsWith("data:")) {
    const url = await persistDataUrl(imageRaw, nextKey());
    out.imageSrc = url;
    if (out.productImg !== undefined) out.productImg = url;
    if (out.product_img !== undefined) out.product_img = url;
    if (out.image_src !== undefined) out.image_src = url;
  }

  if (Array.isArray(out.media) && out.media.length > 0) {
    const media = out.media as ProductMedia[];
    out.media = await Promise.all(
      media.map(async (item) => {
        if (item?.type === "image" && item.src?.startsWith("data:")) {
          return {
            ...item,
            src: await persistDataUrl(item.src, nextKey()),
          };
        }
        if (item?.type === "video" && item.thumbnail?.startsWith("data:")) {
          return {
            ...item,
            thumbnail: await persistDataUrl(item.thumbnail, nextKey()),
          };
        }
        return item;
      }),
    );
  }

  return out;
}

/** Persist a category/section image data URL to storage. */
export async function materializeCategoryImageSrc(
  imageSrc: string | null | undefined,
  categoryKey: string,
): Promise<string | null | undefined> {
  if (imageSrc === undefined) return undefined;
  if (imageSrc == null) return null;
  const raw = String(imageSrc).trim();
  if (!raw) return "";
  if (!raw.startsWith("data:")) return raw;
  return persistDataUrl(raw, `category-${sanitizeCardUsername(categoryKey)}`);
}
