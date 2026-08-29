"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  cardPublicSlug,
  cardPublicUrl,
  getCardProfile,
  type HexaCardProfile,
} from "@/lib/card-profile";
import { getAuthUser, normalizeIndianPhone } from "@/lib/auth";
import { findOrderByCardSlug } from "@/lib/orders";
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

  const loadCard = useCallback(async () => {
    const normalizedSlug = slugParam.trim().toLowerCase();

    if (normalizedSlug) {
      // Prefer Supabase so public links work across devices
      const dbCard = await fetchCardBySlug(normalizedSlug);
      if (dbCard) {
        const order = findOrderByCardSlug(normalizedSlug);
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
        const liveUrl = order
          ? resolveOrderLiveUrl(order).liveUrl
          : `https://hexacards.com/${slug}`;

        setProfile(loaded);
        setUserName(
          loaded.contact.cardName?.trim() || dbCard.cardName || "HexaCards User",
        );
        setPublicSlug(slug);
        setPublicUrl(liveUrl);
        setEditHref(
          order
            ? `/dashboard/edit-card?order=${encodeURIComponent(order.id)}`
            : "/dashboard/edit-card",
        );
        setOwnerPhone(
          normalizeIndianPhone(order?.ownerPhone ?? "") ||
            normalizeIndianPhone(order?.phone ?? "") ||
            normalizeIndianPhone(dbCard.mobile) ||
            normalizeIndianPhone(loaded.contact.mobile),
        );
        setCardId(dbCard.cardId);
        setNotFound(false);
        setReady(true);
        return;
      }

      const order = findOrderByCardSlug(normalizedSlug);
      if (order) {
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
        setPublicUrl(liveUrl);
        setEditHref(
          `/dashboard/edit-card?order=${encodeURIComponent(order.id)}`,
        );
        setOwnerPhone(
          normalizeIndianPhone(order.ownerPhone) ||
            normalizeIndianPhone(order.phone) ||
            normalizeIndianPhone(loaded.contact.mobile),
        );
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
    setCardId(null);
    setNotFound(false);
    setReady(true);
  }, [slugParam]);

  useEffect(() => {
    void loadCard();
    const onChange = () => {
      void loadCard();
    };
    window.addEventListener("hexa-order-profiles-change", onChange);
    window.addEventListener("hexa-orders-change", onChange);
    return () => {
      window.removeEventListener("hexa-order-profiles-change", onChange);
      window.removeEventListener("hexa-orders-change", onChange);
    };
  }, [loadCard]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#BC7C10]/25 border-t-[#BC7C10]" />
          <p className="mt-3 text-sm font-medium text-[#5c5346]">
            Loading card…
          </p>
        </div>
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
      <div className="min-h-screen bg-[#F4F5F7]">
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

        <div className="mx-auto max-w-lg px-3 pb-10 sm:px-4">
          <ProfileBanner
            profile={profile}
            userName={userName}
            slug={publicSlug || cardPublicSlug(profile)}
            compact={false}
          />
        </div>
      </div>
    </MessageOwnerContext.Provider>
  );
}
