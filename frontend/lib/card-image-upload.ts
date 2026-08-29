import { apiFetch } from "@/lib/api-config";

export type CardImageKind = "profile" | "background";

export type CardImageUploadResult = {
  kind: CardImageKind;
  username: string;
  filename: string;
  path: string;
  url: string;
  cardId?: number | null;
  dbUpdated?: boolean;
};

/**
 * Upload profile or background image for a card username (unic_card_name).
 * Server always overwrites `{username}-profile.jpg` or `{username}-background.jpg`.
 */
export async function uploadCardImage(opts: {
  username: string;
  kind: CardImageKind;
  dataUrl: string;
  cardId?: number | null;
}): Promise<CardImageUploadResult> {
  const username = opts.username.trim().toLowerCase();
  if (!username) throw new Error("Card username is required");
  if (!opts.dataUrl?.startsWith("data:")) {
    throw new Error("Invalid image data");
  }

  const res = await apiFetch<CardImageUploadResult>("/api/cards/images", {
    method: "POST",
    body: JSON.stringify({
      username,
      kind: opts.kind,
      dataUrl: opts.dataUrl,
      cardId: opts.cardId && opts.cardId > 0 ? opts.cardId : undefined,
    }),
  });

  if (!res.ok || !res.data?.url) {
    throw new Error(res.error || "Failed to upload image");
  }

  return res.data;
}
