"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  findOrderByCardSlug,
  fetchOrderByCardSlug,
  isOrderPaymentPaid,
  type HexaOrder,
} from "@/lib/orders";
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
  const [ownerUserId, setOwnerUserId] = useState<number | null>(null);
  const [cardId, setCardId] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const loadSeq = useRef(0);
  const ownerPhoneRef = useRef("");
  const hasPaintedRef = useRef(false);

  function resolveOwnerAccountPhone(order: HexaOrder | null | undefined): string {
    return (
      normalizeIndianPhone(order?.ownerPhone ?? "") ||
      normalizeIndianPhone(order?.phone ?? "")
    );
  }

  function resolveMessageOwnerPhone(
    order: HexaOrder | null | undefined,
    cardMobile?: string | null,
    profileMobile?: string | null,
  ): string {
    const fromCard = cardMobile?.includes("|")
      ? cardMobile.split("|")[0]
      : cardMobile;
    return (
      resolveOwnerAccountPhone(order) ||
      normalizeIndianPhone(fromCard ?? "") ||
      normalizeIndianPhone(profileMobile ?? "")
    );
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

  function applyLoadedCard(opts: {
    loaded: HexaCardProfile;
    slug: string;
    order: HexaOrder | null;
    dbCardName?: string;
    dbUserId?: number | null;
    dbCardId?: number | null;
    dbMobile?: string | null;
  }) {
    const {
      loaded,
      slug,
      order,
      dbCardName,
      dbUserId,
      dbCardId,
      dbMobile,
    } = opts;
    const messageOwnerPhone = resolveMessageOwnerPhone(
      order,
      dbMobile,
      loaded.contact.mobile,
    );
    ownerPhoneRef.current = messageOwnerPhone;

    setProfile(loaded);
    setUserName(
      loaded.contact.cardName?.trim() || dbCardName || "HexaCards User",
    );
    setPublicSlug(slug);
    setPublicUrl(buildOwnerDisplayCardUrl(slug));
    setEditHref(
      order
        ? `/dashboard/edit-card?order=${encodeURIComponent(order.id)}`
        : "/dashboard/edit-card",
    );
    setOwnerPhone(messageOwnerPhone);
    setOwnerUserId(
      dbUserId && dbUserId > 0
        ? dbUserId
        : order?.userId && order.userId > 0
          ? order.userId
          : null,
    );
    syncOwnerAccess(messageOwnerPhone);
    setCardId(dbCardId && dbCardId > 0 ? dbCardId : order?.cardId ?? null);
    setNotFound(false);
    setReady(true);
    hasPaintedRef.current = true;
  }

  const loadCard = useCallback(async (mode: "full" | "soft" = "full") => {
    const seq = ++loadSeq.current;
    const normalizedSlug = slugParam.trim().toLowerCase();

    if (!normalizedSlug || isReservedRootSegment(normalizedSlug)) {
      if (seq !== loadSeq.current) return;
      setProfile(null);
      setNotFound(true);
      setReady(true);
      hasPaintedRef.current = false;
      return;
    }

    // Instant paint from local cache (View card / returning visitors)
    const localOrder = findOrderByCardSlug(normalizedSlug);
    if (
      mode === "full" &&
      localOrder &&
      isOrderPaymentPaid(localOrder)
    ) {
      const local =
        getOrderCardProfile(localOrder.id) ??
        loadOrderCardProfile(
          localOrder,
          localOrder.customerName,
          localOrder.phone,
        );
      const { slug } = resolveOrderLiveUrl(localOrder);
      applyLoadedCard({
        loaded: local,
        slug,
        order: localOrder,
        dbCardName: localOrder.customerName,
        dbUserId: localOrder.userId,
        dbCardId: localOrder.cardId,
      });
    }

    // Network refresh — parallel card + order (was sequential)
    const [dbCard, remoteOrder] = await Promise.all([
      fetchCardBySlug(normalizedSlug, {
        // Soft refresh shouldn't inflate page views
        countView: mode === "full",
      }),
      // Skip network order lookup when local paid order already known
      localOrder && isOrderPaymentPaid(localOrder)
        ? Promise.resolve(null)
        : fetchOrderByCardSlug(normalizedSlug),
    ]);

    if (seq !== loadSeq.current) return;

    const order =
      (localOrder && isOrderPaymentPaid(localOrder) ? localOrder : null) ??
      remoteOrder;

    if (dbCard) {
      if (order && !isOrderPaymentPaid(order)) {
        setProfile(null);
        setNotFound(true);
        setReady(true);
        return;
      }

      const local =
        order != null
          ? getOrderCardProfile(order.id) ??
            loadOrderCardProfile(order, order.customerName, order.phone)
          : null;
      const localIsNewer =
        Boolean(local?.updatedAt) &&
        Date.parse(local!.updatedAt) >=
          Date.parse(dbCard.updateTime || dbCard.dateTime || "0");
      const loaded = localIsNewer ? local! : cardDtoToProfile(dbCard, local);

      if (order) {
        try {
          cacheOrderCardProfile(order.id, loaded);
        } catch {
          // ignore quota
        }
      }

      applyLoadedCard({
        loaded,
        slug: dbCard.unicCardName,
        order,
        dbCardName: dbCard.cardName,
        dbUserId: dbCard.userId,
        dbCardId: dbCard.cardId,
        dbMobile: dbCard.mobile,
      });
      return;
    }

    if (order && isOrderPaymentPaid(order)) {
      const saved = getOrderCardProfile(order.id);
      const loaded =
        saved ??
        loadOrderCardProfile(order, order.customerName, order.phone);
      const { slug } = resolveOrderLiveUrl(order);
      applyLoadedCard({
        loaded,
        slug,
        order,
        dbCardName: order.customerName,
        dbUserId: order.userId,
        dbCardId: order.cardId,
      });
      return;
    }

    // Only show not-found if we never painted a local card
    if (mode === "full" || !hasPaintedRef.current) {
      setProfile(null);
      setNotFound(true);
      setReady(true);
    }
  }, [slugParam]);

  useEffect(() => {
    void loadCard("full");

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const onChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        // Soft: keep current UI visible while refreshing
        void loadCard("soft");
      }, 500);
    };
    const onAuthChange = () => {
      syncOwnerAccess(ownerPhoneRef.current);
    };
    window.addEventListener("hexa-order-profiles-change", onChange);
    window.addEventListener("hexa-orders-change", onChange);
    window.addEventListener("hexa-auth-change", onAuthChange);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("hexa-order-profiles-change", onChange);
      window.removeEventListener("hexa-orders-change", onChange);
      window.removeEventListener("hexa-auth-change", onAuthChange);
    };
  }, [loadCard]);

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
        userId: ownerUserId,
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
