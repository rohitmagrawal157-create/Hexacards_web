import { ImageResponse } from "next/og";
import { getCardOgPayload } from "@/lib/server/card-og-data";
import { getShareSiteOrigin } from "@/lib/site-url";

export const CARD_OG_IMAGE_ALT = "Digital business card profile";
export const CARD_OG_IMAGE_SIZE = { width: 1200, height: 1200 } as const;
export const CARD_OG_IMAGE_TYPE = "image/png";

async function toDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "image/*,*/*" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 32 || buf.byteLength > 8_000_000) return null;
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Shared Open Graph / Twitter card image for a public card slug. */
export async function renderCardOgImage(cardSlug: string) {
  const payload = await getCardOgPayload(cardSlug);
  const name = payload?.name || "HexaCards";
  const origin = getShareSiteOrigin();

  let photoSrc: string | null = null;
  if (payload?.hasProfilePhoto) {
    photoSrc = await toDataUri(payload.imageUrl);
  }
  if (!photoSrc) {
    photoSrc = await toDataUri(`${origin}/Hexacards_Icons.png`);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#141414",
          position: "relative",
        }}
      >
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- OG canvas
          <img
            src={photoSrc}
            alt={name}
            width={1200}
            height={1200}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#BC7C10",
              fontSize: 72,
              fontWeight: 700,
              padding: 48,
              textAlign: "center",
            }}
          >
            {name}
          </div>
        )}
      </div>
    ),
    { ...CARD_OG_IMAGE_SIZE },
  );
}
