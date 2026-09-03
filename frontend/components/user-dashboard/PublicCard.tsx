"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HoneycombPageStatus } from "@/components/ui/honeycomb-loader";
import {
  cardPublicSlug,
  cardPublicUrl,
  getCardProfile,
  type HexaCardProfile,
} from "@/lib/card-profile";
import { getAuthUser, isLoggedIn, isValidIndianPhone, normalizeIndianPhone } from "@/lib/auth";
import { findOrderByCardSlug, fetchOrderByCardSlug, type HexaOrder } from "@/lib/orders";
import {
  getOrderCardProfile,
  loadOrderCardProfile,
  cacheOrderCardProfile,
} from "@/lib/order-card-profile";
import { resolveOrderLiveUrl } from "@/lib/order-card";
import {
  cardDtoToProfile,
  fetchCardBySlug,
} from "@/lib/cards-api";
import { MessageOwnerContext } from "@/lib/message-owner-context";
import { isReservedRootSegment } from "@/lib/reserved-routes";
import {
  buildOwnerDisplayCardUrl,
  buildPublicCardUrl,
} from "@/lib/site-url";
import { publicCardPageClass } from "@/lib/public-card-shell";
import ProfileBanner from "./ProfileBanner";

export default function PublicCard() {
  const params = useParams();
  const slugParam = String(params?.cardSlug ?? params?.slug ?? "");
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<HexaCardProfile | null>(null);
  const [userName, setUserName] = useState("HexaCards User");
  const [publicSlug, setPublicSlug] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [editHref, setEditHref] = useState("/dashboard/edit-card");
  const [notFound, setNotFound] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState("");
  const [cardId, setCardId] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  function resolveOwnerAccountPhone(order: HexaOrder | null | undefined): string {
    return normalizeIndianPhone(order?.ownerPhone ?? "");
  }

  function syncOwnerAccess(ownerAccountPhone: string) {
    if (!isLoggedIn()) {
      setIsOwner(false);
      return;
    }
    const auth = getAuthUser();
    const owner = normalizeIndianPhone(ownerAccountPhone);
    const viewer = normalizeIndianPhone(auth?.phone ?? "");
    setIsOwner(
      Boolean(
        owner &&
          viewer &&
          isValidIndianPhone(owner) &&
          isValidIndianPhone(viewer) &&
          owner === viewer,
      ),
    );
  }

  const loadCard = useCallback(async () => {
    setIsOwner(false);
    const normalizedSlug = slugParam.trim().toLowerCase();

    if (!normalizedSlug || isReservedRootSegment(normalizedSlug)) {
      setNotFound(true);
      setReady(true);
      return;
    }

    if (normalizedSlug) {
      // Prefer Supabase so public links work across devices
      const dbCard = await fetchCardBySlug(normalizedSlug);
      if (dbCard) {
        const order =
          findOrderByCardSlug(normalizedSlug) ??
          (await fetchOrderByCardSlug(normalizedSlug));
        const ownerAccountPhone = resolveOwnerAccountPhone(order);
        const local =
          order != null
            ? getOrderCardProfile(order.id) ??
              loadOrderCardProfile(order, order.customerName, order.phone)
            : null;
        const loaded = cardDtoToProfile(dbCard, local);
        if (order) {
          try {
            cacheOrderCardProfile(order.id, loaded);
          } catch {
            // ignore quota
          }
        }

        const slug = dbCard.unicCardName;
        const ownerDisplayUrl = buildOwnerDisplayCardUrl(slug);

        setProfile(loaded);
        setUserName(
          loaded.contact.cardName?.trim() || dbCard.cardName || "HexaCards User",
        );
        setPublicSlug(slug);
        setPublicUrl(ownerDisplayUrl);
        setEditHref(
          order
            ? `/dashboard/edit-card?order=${encodeURIComponent(order.id)}`
            : "/dashboard/edit-card",
        );
        setOwnerPhone(ownerAccountPhone);
        syncOwnerAccess(ownerAccountPhone);
        setCardId(dbCard.cardId);
        setNotFound(false);
        setReady(true);
        return;
      }

      const order =
        findOrderByCardSlug(normalizedSlug) ??
        (await fetchOrderByCardSlug(normalizedSlug));
      if (order) {
        const ownerAccountPhone = resolveOwnerAccountPhone(order);
        const saved = getOrderCardProfile(order.id);
        const loaded =
          saved ??
          loadOrderCardProfile(order, order.customerName, order.phone);
        const { slug, liveUrl } = resolveOrderLiveUrl(order);
        setProfile(loaded);
        setUserName(
          loaded.contact.cardName?.trim() ||
            order.customerName ||
            "HexaCards User",
        );
        setPublicSlug(slug);
        setPublicUrl(buildOwnerDisplayCardUrl(slug));
        setEditHref(
          `/dashboard/edit-card?order=${encodeURIComponent(order.id)}`,
        );
        setOwnerPhone(ownerAccountPhone);
        syncOwnerAccess(ownerAccountPhone);
        setCardId(order.cardId ?? null);
        setNotFound(false);
        setReady(true);
        return;
      }

      setProfile(null);
      setNotFound(true);
      setReady(true);
      return;
    }

    const auth = getAuthUser();
    const stored = getCardProfile(auth?.name, auth?.phone);
    setUserName(auth?.name || stored.contact.cardName || "HexaCards User");
    setProfile(stored);
    setPublicSlug(cardPublicSlug(stored));
    setPublicUrl(cardPublicUrl(stored));
    setEditHref("/dashboard/edit-card");
    setOwnerPhone(
      normalizeIndianPhone(auth?.phone ?? "") ||
        normalizeIndianPhone(stored.contact.mobile),
    );
    syncOwnerAccess(normalizeIndianPhone(auth?.phone ?? ""));
    setCardId(null);
    setNotFound(false);
    setReady(true);
  }, [slugParam]);

  useEffect(() => {
    void loadCard();
    const onChange = () => {
      void loadCard();
    };
    const onAuthChange = () => {
      syncOwnerAccess(ownerPhone);
    };
    window.addEventListener("hexa-order-profiles-change", onChange);
    window.addEventListener("hexa-orders-change", onChange);
    window.addEventListener("hexa-auth-change", onAuthChange);
    return () => {
      window.removeEventListener("hexa-order-profiles-change", onChange);
      window.removeEventListener("hexa-orders-change", onChange);
      window.removeEventListener("hexa-auth-change", onAuthChange);
    };
  }, [loadCard, ownerPhone]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
        <HoneycombPageStatus label="Loading card…" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4F5F7] px-4 text-center">
        <p className="text-sm font-semibold text-[#141414]">Card not found</p>
        <p className="max-w-sm text-xs text-[#8a8174]">
          No card matches{" "}
          <span className="font-mono text-[#141414]">/{slugParam}</span>. Check
          the link or open your card from the dashboard.
        </p>
        <Link
          href="/dashboard?tab=cards"
          className="rounded-lg bg-[#141414] px-4 py-2.5 text-sm font-semibold text-white"
        >
          My Cards
        </Link>
      </div>
    );
  }

  const displayUrl = publicUrl || cardPublicUrl(profile);

  return (
    <MessageOwnerContext.Provider
      value={{
        ownerPhone,
        cardId,
        cardSlug: publicSlug || null,
      }}
    >
      <div className={publicCardPageClass(isOwner)}>
        {isOwner ? (
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4">
            <Link
              href={editHref}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5c5346] hover:text-[#141414]"
            >
              <ArrowLeft className="h-4 w-4" />
              Edit card
            </Link>
            <p className="truncate font-mono text-[11px] text-[#8a8174]">
              {displayUrl}
            </p>
          </div>
        ) : null}

        <div
          className={
            isOwner
              ? "mx-auto max-w-lg px-3 pb-10 sm:px-4"
              : "mx-auto w-full max-w-none px-0 pb-0 sm:max-w-lg sm:px-3 sm:pb-8"
          }
        >
          <ProfileBanner
            profile={profile}
            userName={userName}
            slug={publicSlug || cardPublicSlug(profile)}
            compact={false}
            publicView={!isOwner}
          />
        </div>
      </div>
    </MessageOwnerContext.Provider>
  );
}
