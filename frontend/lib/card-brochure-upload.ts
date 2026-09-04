import { apiFetch } from "@/lib/api-config";

export type BrochureUploadResult = {
  filename: string;
  url: string;
  displayName: string;
  mime: string;
  size: number;
  cardId?: number | null;
  brochure: string;
};

/** Upload brochure to Supabase (public) so any visitor can download it. */
export async function uploadCardBrochure(opts: {
  username: string;
  file: File;
  cardId?: number | null;
}): Promise<BrochureUploadResult> {
  const username = opts.username.trim().toLowerCase();
  if (!username) throw new Error("Card username is required");
  if (!opts.file) throw new Error("Brochure file is required");

  const form = new FormData();
  form.append("file", opts.file);
  form.append("username", username);
  if (opts.cardId && opts.cardId > 0) {
    form.append("cardId", String(opts.cardId));
  }

  const res = await apiFetch<BrochureUploadResult>("/api/cards/brochure", {
    method: "POST",
    body: form,
  });

  if (!res.ok || !res.data?.filename) {
    throw new Error(res.error || "Failed to upload brochure");
  }

  return res.data;
}

export async function clearCardBrochureRemote(opts: {
  username: string;
  cardId?: number | null;
  filename?: string | null;
}): Promise<void> {
  const params = new URLSearchParams();
  if (opts.username.trim()) params.set("username", opts.username.trim());
  if (opts.cardId && opts.cardId > 0) params.set("cardId", String(opts.cardId));
  if (opts.filename?.trim()) params.set("filename", opts.filename.trim());

  const res = await apiFetch(`/api/cards/brochure?${params.toString()}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    console.warn("[brochure] clear failed:", res.error);
  }
}
