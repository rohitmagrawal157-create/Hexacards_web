import { apiFetch } from "@/lib/api-config";
import {
  DEFAULT_HOME_OFFER,
  type HomeOfferDto,
  type OfferPageTarget,
} from "@/lib/server/home-offer-types";

export type HomeOffer = HomeOfferDto;
export type { OfferPageTarget };
export {
  DEFAULT_HOME_OFFER,
  OFFER_PAGE_OPTIONS,
  labelForPageTarget,
  normalizePageTarget,
} from "@/lib/server/home-offer-types";

export async function fetchHomeOffers(): Promise<HomeOffer[]> {
  const res = await apiFetch<HomeOffer[]>("/api/offers");
  if (!res.ok || !Array.isArray(res.data)) {
    throw new Error(res.error || "Failed to load offers");
  }
  return res.data;
}

/** Active offer for the current browser pathname (or page key). */
export async function fetchOfferForPage(
  pageOrPath: string,
): Promise<HomeOffer> {
  const res = await apiFetch<HomeOffer>(
    `/api/offers?page=${encodeURIComponent(pageOrPath)}`,
  );
  if (!res.ok || !res.data) {
    return { ...DEFAULT_HOME_OFFER, active: false };
  }
  return {
    ...DEFAULT_HOME_OFFER,
    ...res.data,
    imageUrl: res.data.imageUrl || DEFAULT_HOME_OFFER.imageUrl,
    linkUrl: res.data.linkUrl || DEFAULT_HOME_OFFER.linkUrl,
    showOnPages: res.data.showOnPages?.length
      ? res.data.showOnPages
      : DEFAULT_HOME_OFFER.showOnPages,
  };
}

export async function fetchHomeOffer(): Promise<HomeOffer> {
  return fetchOfferForPage("/");
}

export async function createHomeOffer(input: {
  title: string;
  linkUrl: string;
  active?: boolean;
  sortOrder?: number;
  showOnPages?: OfferPageTarget[];
  imageDataUrl?: string;
  imageUrl?: string;
}): Promise<HomeOffer> {
  const res = await apiFetch<HomeOffer>("/api/offers", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      linkUrl: input.linkUrl,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
      showOnPages: input.showOnPages ?? ["/"],
      imageDataUrl: input.imageDataUrl,
      imageUrl: input.imageUrl,
    }),
  });
  if (!res.ok || !res.data) {
    throw new Error(res.error || "Failed to create offer");
  }
  return res.data;
}

export async function updateHomeOffer(
  id: number,
  input: {
    title?: string;
    linkUrl?: string;
    active?: boolean;
    sortOrder?: number;
    showOnPages?: OfferPageTarget[];
    imageDataUrl?: string;
    imageUrl?: string;
  },
): Promise<HomeOffer> {
  const res = await apiFetch<HomeOffer>(`/api/offers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: input.title,
      linkUrl: input.linkUrl,
      active: input.active,
      sortOrder: input.sortOrder,
      showOnPages: input.showOnPages,
      imageDataUrl: input.imageDataUrl,
      imageUrl: input.imageUrl,
    }),
  });
  if (!res.ok || !res.data) {
    throw new Error(res.error || "Failed to update offer");
  }
  return res.data;
}

export async function deleteHomeOffer(id: number): Promise<void> {
  const res = await apiFetch<{ deleted: boolean }>(`/api/offers/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(res.error || "Failed to delete offer");
  }
}
