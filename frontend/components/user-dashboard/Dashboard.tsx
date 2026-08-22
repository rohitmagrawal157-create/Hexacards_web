"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Clock3,
  CreditCard,
  Eye,
  FolderOpen,
  Headphones,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Shield,
  ShoppingBag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  clearAuthUser,
  getAuthUser,
  isLoggedIn,
  loginPathWithNext,
  type HexaAuthUser,
} from "@/lib/auth";
import {
  formatOrderDate,
  getOrdersForPhone,
  statusLabel,
  type HexaOrder,
  type HexaOrderStatus,
} from "@/lib/orders";
import {
  getUserDashboardCardsFromOrders,
  isCardProductOrder,
  orderCardImage,
  type UserDashboardCard,
} from "@/lib/user-cards";
import { ensureOrderCardProfile } from "@/lib/order-card-profile";
import { buildCardQrImageUrl } from "@/lib/order-card";
import {
  deleteCardMessage,
  formatMessageDateShort,
  getCardMessages,
  markAllMessagesRead,
  markMessageRead,
  type CardMessage,
} from "@/lib/card-messages";

type NavKey =
  | "cards"
  | "messages"
  | "orders"
  | "security"
  | "refer"
  | "payout"
  | "support";

const MENU_ITEMS: { key: NavKey; label: string; icon: typeof CreditCard }[] = [
  { key: "cards", label: "My Cards", icon: CreditCard },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "orders", label: "Order History", icon: ShoppingBag },
  { key: "security", label: "Account Security", icon: Shield },
];

// const REFERRAL_ITEMS: { key: NavKey; label: string; icon: typeof Users }[] = [
//   { key: "refer", label: "Refer and Earn", icon: Users },
//   { key: "payout", label: "Referral Payout", icon: FolderOpen },
// ];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "HC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function sectionMeta(key: NavKey) {
  switch (key) {
    case "cards":
      return {
        title: "Overview",
        subtitle: "Your cards, recent activity, and order status in one place.",
      };
    case "messages":
      return {
        title: "Messages",
        subtitle: "Leads and notifications from people who tap your card.",
      };
    case "orders":
      return {
        title: "Order History",
        subtitle: "Track shipments and review every HexaCards order.",
      };
    case "security":
      return {
        title: "Account Security",
        subtitle: "Manage how you sign in and keep your account safe.",
      };
    case "refer":
      return {
        title: "Refer and Earn",
        subtitle: "Invite colleagues and earn rewards on successful orders.",
      };
    case "payout":
      return {
        title: "Referral Payout",
        subtitle: "Review referral earnings and payout status.",
      };
    case "support":
      return {
        title: "Support",
        subtitle: "Get help with cards, shipping, and your account.",
      };
  }
}

function statusTone(status: HexaOrderStatus) {
  switch (status) {
    case "placed":
      return "bg-[#FFF8ED] text-[#9a650d] ring-1 ring-[#BC7C10]/20";
    case "shipped":
      return "bg-sky-50 text-sky-800 ring-1 ring-sky-200";
    case "delivered":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
  }
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
  badge,
}: {
  label: string;
  icon: typeof CreditCard;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
        active
          ? "bg-[#141414] text-white"
          : "text-[#4a4a4a] hover:bg-black/[0.04] hover:text-[#141414]"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? "text-[#BC7C10]" : "text-[#8a8a8a] group-hover:text-[#141414]"}`}
        strokeWidth={1.75}
      />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            active ? "bg-white/15 text-white" : "bg-[#F3F4F6] text-[#5c5346]"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<HexaAuthUser | null>(null);
  const [active, setActive] = useState<NavKey>("cards");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<HexaOrder[]>([]);
  const [messages, setMessages] = useState<CardMessage[]>([]);
  const unreadCount = messages.filter((m) => !m.read).length;

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (
      tab === "cards" ||
      tab === "messages" ||
      tab === "orders" ||
      tab === "security" ||
      tab === "refer" ||
      tab === "payout" ||
      tab === "support"
    ) {
      setActive(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace(loginPathWithNext("/dashboard"));
      return;
    }

    function syncWorkspace() {
      const auth = getAuthUser();
      if (!auth) {
        setAuthReady(false);
        router.replace(loginPathWithNext("/dashboard"));
        return;
      }
      setUser(auth);
      setOrders(getOrdersForPhone(auth.phone));
      setMessages(getCardMessages());
      setAuthReady(true);
    }

    syncWorkspace();

    function onAuthChange() {
      syncWorkspace();
    }

    function onOrdersChange() {
      const current = getAuthUser();
      setOrders(current ? getOrdersForPhone(current.phone) : []);
    }

    function onMessagesChange() {
      setMessages(getCardMessages());
    }

    function onVisibility() {
      if (document.visibilityState === "visible") syncWorkspace();
    }

    function onStorage(e: StorageEvent) {
      if (
        e.key === "hexaOrders" ||
        e.key === "hexaAuthUser" ||
        e.key === "hexaOrderCardProfiles"
      ) {
        syncWorkspace();
      }
    }

    function onProfilesChange() {
      const current = getAuthUser();
      setOrders(current ? getOrdersForPhone(current.phone) : []);
    }

    window.addEventListener("hexa-auth-change", onAuthChange);
    window.addEventListener("hexa-orders-change", onOrdersChange);
    window.addEventListener("hexa-order-profiles-change", onProfilesChange);
    window.addEventListener("hexa-card-messages-change", onMessagesChange);
    window.addEventListener("focus", syncWorkspace);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("hexa-auth-change", onAuthChange);
      window.removeEventListener("hexa-orders-change", onOrdersChange);
      window.removeEventListener("hexa-order-profiles-change", onProfilesChange);
      window.removeEventListener("hexa-card-messages-change", onMessagesChange);
      window.removeEventListener("focus", syncWorkspace);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, [router]);

  // Re-read orders whenever the user lands on cards/orders (e.g. from checkout)
  useEffect(() => {
    if (!authReady) return;
    const auth = getAuthUser();
    if (!auth) return;
    setOrders(getOrdersForPhone(auth.phone));
  }, [authReady, active, searchParams]);

  const avatar = useMemo(() => (user ? initials(user.name) : "HC"), [user]);
  const copy = sectionMeta(active);

  function handleLogout() {
    clearAuthUser();
    router.replace("/");
  }

  function handleRefresh() {
    setRefreshing(true);
    const next = getAuthUser();
    setUser(next);
    setOrders(next ? getOrdersForPhone(next.phone) : []);
    setMessages(getCardMessages());
    window.setTimeout(() => setRefreshing(false), 500);
  }

  function selectNav(key: NavKey) {
    setActive(key);
    setSidebarOpen(false);
    router.replace(key === "cards" ? "/dashboard" : `/dashboard?tab=${key}`);
  }

  if (!authReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#BC7C10]/25 border-t-[#BC7C10]" />
          <p className="mt-3 text-sm font-medium text-[#5c5346]">
            Loading workspace…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#141414]">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-[60px] sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#141414] hover:bg-black/[0.04] lg:hidden"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              href="/"
              className="relative h-8 w-[132px] sm:h-9 sm:w-[150px]"
            >
              <Image
                src="/Images/Hexacards.png"
                alt="HexaCards"
                fill
                priority
                className="object-contain object-left"
                sizes="150px"
              />
            </Link>
            <span className="hidden h-5 w-px bg-black/10 sm:block" />
            <span className="hidden text-xs font-medium tracking-wide text-[#8a8174] uppercase sm:inline">
              Workspace
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1 text-sm font-medium text-[#5c5346] transition-colors hover:text-[#141414] md:inline-flex"
            >
              Back to website
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white py-1.5 pr-3 pl-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#141414] text-[11px] font-bold text-white">
                {avatar}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="max-w-[110px] truncate text-xs font-semibold sm:max-w-[140px]">
                  {user.name}
                </p>
                <p className="text-[10px] text-[#8a8174]">+91 {user.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-[#141414]/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-black/[0.06] bg-white transition-transform duration-300 lg:sticky lg:top-[60px] lg:z-0 lg:h-[calc(100vh-60px)] lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3 lg:hidden">
            <p className="text-sm font-semibold">Navigation</p>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/[0.04]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <div className="mb-5 rounded-xl bg-[#FAFAF8] p-3 ring-1 ring-black/[0.04]">
              <div className="flex items-center gap-3">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#141414] text-xs font-bold text-white">
                  {avatar}
                  <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="text-[11px] text-[#8a8174]">Account owner</p>
                </div>
              </div>
            </div>

            <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.14em] text-[#9a9a9a] uppercase">
              Menu
            </p>
            <nav className="mb-5 space-y-0.5">
              {MENU_ITEMS.map((item) => (
                <NavButton
                  key={item.key}
                  label={item.label}
                  icon={item.icon}
                  active={active === item.key}
                  onClick={() => selectNav(item.key)}
                  badge={
                    item.key === "orders" && orders.length > 0
                      ? String(orders.length)
                      : item.key === "messages" && unreadCount > 0
                        ? String(unreadCount)
                        : undefined
                  }
                />
              ))}
            </nav>

            {/* <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.14em] text-[#9a9a9a] uppercase">
              Growth
            </p> */}
            {/* <nav className="mb-5 space-y-0.5">
              {REFERRAL_ITEMS.map((item) => (
                <NavButton
                  key={item.key}
                  label={item.label}
                  icon={item.icon}
                  active={active === item.key}
                  onClick={() => selectNav(item.key)}
                />
              ))}
            </nav> */}

            <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.14em] text-[#9a9a9a] uppercase">
              Help
            </p>
            <NavButton
              label="Support"
              icon={Headphones}
              active={active === "support"}
              onClick={() => selectNav("support")}
              badge="Live"
            />
          </div>

          <div className="border-t border-black/[0.06] p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#5c5346] transition-colors hover:bg-[#FAFAF8] hover:text-[#141414]"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#BC7C10] uppercase">
                HexaCards
              </p>
              <h1 className="mt-1 font-dashboard text-[1.75rem] font-extrabold tracking-[-0.03em] text-[#141414] sm:text-[2rem]">
                {copy.title}
              </h1>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-[#6b6560]">
                {copy.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#141414] shadow-sm transition-colors hover:bg-[#FAFAF8]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {active === "cards" ? (
            <CardsPanel user={user} orders={orders} />
          ) : null}
          {active === "messages" ? (
            <MessagesPanel
              messages={messages}
              onChange={() => setMessages(getCardMessages())}
            />
          ) : null}
          {active === "orders" ? <OrdersPanel orders={orders} /> : null}
          {active === "security" ? <SecurityPanel user={user} /> : null}
          {active === "refer" ? (
            <EmptyPanel
              icon={Users}
              title="Referral program coming soon"
              text="Invite friends to HexaCards and earn rewards. Your unique link will appear here."
              action={{ href: "/products", label: "Browse products" }}
            />
          ) : null}
          {active === "payout" ? (
            <EmptyPanel
              icon={FolderOpen}
              title="No payouts yet"
              text="Referral earnings and payout history will appear once the program is live."
            />
          ) : null}
          {active === "support" ? <SupportPanel /> : null}
        </main>
      </div>
    </div>
  );
}

function CardsPanel({
  user,
  orders,
}: {
  user: HexaAuthUser;
  orders: HexaOrder[];
}) {
  const [qrCard, setQrCard] = useState<UserDashboardCard | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<HexaOrder | null>(null);
  const [copied, setCopied] = useState(false);
  const [profileTick, setProfileTick] = useState(0);

  useEffect(() => {
    orders.filter(isCardProductOrder).forEach((order) => {
      ensureOrderCardProfile(order);
    });
  }, [orders]);

  useEffect(() => {
    function onProfilesChange() {
      setProfileTick((n) => n + 1);
    }
    window.addEventListener("hexa-order-profiles-change", onProfilesChange);
    return () => {
      window.removeEventListener("hexa-order-profiles-change", onProfilesChange);
    };
  }, []);

  const userCards = useMemo(
    () => getUserDashboardCardsFromOrders(orders),
    [orders, profileTick],
  );
  const hasCard = userCards.length > 0;
  const totalSpend = orders.reduce((sum, o) => sum + o.total, 0);

  async function copyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-2.5 sm:grid-cols-3">
        {[
          {
            label: "Active cards",
            value: String(userCards.length),
            hint: hasCard ? "Live on your dashboard" : "Unlocks after first order",
            icon: CreditCard,
          },
          {
            label: "Orders",
            value: String(orders.length),
            hint: orders.length
              ? "See Order History to track"
              : "None yet",
            icon: Package,
          },
          {
            label: "Total spent",
            value: `₹${totalSpend.toLocaleString("en-IN")}`,
            hint: "All-time on HexaCards",
            icon: ShoppingBag,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-black/[0.06] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold tracking-wide text-[#8a8174] uppercase">
                  {stat.label}
                </p>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FAFAF8] text-[#BC7C10]">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
              </div>
              <p className="mt-1.5 font-dashboard text-xl font-extrabold tracking-[-0.03em] tabular-nums text-[#141414]">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#8a8174]">
                {stat.hint}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className={
          hasCard
            ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
            : "grid gap-5"
        }
      >
        {userCards.map((card) => (
          <article
            key={card.orderId}
            className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <div className="relative aspect-[16/10] bg-[#111]">
              {(() => {
                const img = orderCardImage(card.productTitle, card.productId);
                return (
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover opacity-90"
                    sizes="(max-width: 1024px) 100vw, 480px"
                  />
                );
              })()}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                {card.isLatest ? (
                  <span className="rounded-md bg-white/15 px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm">
                    Latest
                  </span>
                ) : null}
                <span className="rounded-md bg-white/15 px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm">
                  {statusLabel(card.status)}
                </span>
              </div>
              <div className="absolute right-4 bottom-4 left-4 text-white">
                <p className="font-dashboard text-xl font-extrabold tracking-[-0.02em] text-white">
                  {card.name}
                </p>
                <p className="mt-0.5 text-sm text-white/80">{card.subtitle}</p>
                {card.isEditable ? (
                  <p className="mt-1 truncate font-mono text-[11px] text-white/60">
                    {card.publicUrl.replace(/^https:\/\//, "")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] px-3 py-2.5">
              {card.isEditable ? (
                <>
                  <button
                    type="button"
                    onClick={() => setQrCard(card)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAFAF8] px-3 py-2 text-xs font-semibold text-[#141414] ring-1 ring-black/[0.05] hover:bg-[#F3F4F6]"
                  >
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </button>
                  <div className="flex items-center gap-2">
                    <Link
                      href={card.publicPath}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAFAF8] px-3 py-2 text-xs font-semibold text-[#141414] ring-1 ring-black/[0.05] hover:bg-[#F3F4F6]"
                    >
                      <Eye className="h-4 w-4" strokeWidth={2} />
                      View
                    </Link>
                    <Link
                      href={`/dashboard/edit-card?order=${encodeURIComponent(card.orderId)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#BC7C10] px-3 py-2 text-xs font-semibold text-white hover:bg-[#9a650d]"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} />
                      Edit
                    </Link>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const order = orders.find((o) => o.id === card.orderId) ?? null;
                    setDetailsOrder(order);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAFAF8] px-3 py-2 text-xs font-semibold text-[#141414] ring-1 ring-black/[0.05] hover:bg-[#F3F4F6]"
                >
                  <Package className="h-4 w-4" />
                  Details
                </button>
              )}
            </div>
          </article>
        ))}

        <Link
          href="/design-your-card"
          className={`group flex flex-col items-center justify-center rounded-xl border border-dashed border-black/15 bg-white px-6 text-center transition-all hover:border-[#BC7C10]/50 hover:bg-[#FFFCF7] ${
            hasCard ? "min-h-[260px]" : "min-h-[280px] max-w-xl mx-auto w-full sm:col-span-2 xl:col-span-1"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAFAF8] text-[#BC7C10] ring-1 ring-black/[0.05] transition-colors group-hover:bg-[#FFF8ED]">
            <Plus className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="mt-4 font-dashboard text-lg font-extrabold tracking-[-0.02em] text-[#141414]">
            {hasCard ? "Order another card" : "Order your first card"}
          </p>
          <p className="mt-1 max-w-[260px] text-sm text-[#6b6560]">
            {hasCard
              ? "Design a new NFC card — it will appear here after checkout."
              : "Design your card, checkout, and it will show up here instantly."}
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#BC7C10]">
            Design your card
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      {qrCard ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          onClick={() => setQrCard(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  id="qr-modal-title"
                  className="font-dashboard text-lg font-extrabold tracking-[-0.02em] text-[#141414]"
                >
                  Card QR code
                </p>
                <p className="mt-0.5 text-xs text-[#6b6560]">
                  {qrCard.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrCard(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5c5346] hover:bg-[#FAFAF8]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex justify-center rounded-xl border border-black/[0.06] bg-[#FAFAF8] p-4">
              <img
                src={buildCardQrImageUrl(qrCard.publicUrl)}
                alt={`QR code for ${qrCard.publicUrl}`}
                width={220}
                height={220}
                className="h-[220px] w-[220px] rounded-lg bg-white"
              />
            </div>

            <p className="mt-3 break-all text-center font-mono text-[11px] text-[#5c5346]">
              {qrCard.publicUrl}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copyShareUrl(qrCard.publicUrl)}
                className="rounded-lg border border-black/[0.08] px-3 py-2.5 text-[13px] font-semibold text-[#141414] hover:bg-[#FAFAF8]"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={qrCard.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-[#BC7C10] px-3 py-2.5 text-[13px] font-bold text-white hover:bg-[#9a650d]"
              >
                Open link
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {detailsOrder ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="details-modal-title"
          onClick={() => setDetailsOrder(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p id="details-modal-title" className="text-[15px] font-bold text-[#141414]">
                  Order Details
                </p>
                <p className="mt-0.5 text-xs text-[#6b6560]">
                  {detailsOrder.productTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOrder(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5c5346] hover:bg-[#FAFAF8]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(() => {
              // New orders store details directly; old orders store them in cardDesign
              const logoSrc =
                detailsOrder.orderLogoSrc ||
                detailsOrder.cardDesign?.logoSrc ||
                null;
              const brandName =
                detailsOrder.businessName ||
                detailsOrder.cardDesign?.name ||
                detailsOrder.customerName ||
                null;
              // extraLine is saved as "Platform: url" — extract just the URL portion
              const rawExtra = detailsOrder.reviewLink || detailsOrder.cardDesign?.extraLine || null;
              const reviewLink = rawExtra
                ? rawExtra.includes(": ")
                  ? rawExtra.split(": ").slice(1).join(": ").trim()
                  : rawExtra.trim()
                : null;

              const hasAny = logoSrc || brandName || reviewLink;

              return (
                <div className="mt-4 space-y-4">
                  {/* Logo */}
                  {logoSrc ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a]">
                        Business Logo
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoSrc}
                        alt="Business logo"
                        className="h-16 w-auto max-w-[160px] rounded-xl border border-black/[0.06] bg-[#FAFAF8] object-contain p-2"
                      />
                    </div>
                  ) : null}

                  {/* Business / brand name */}
                  {brandName ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a]">
                        Business / Brand Name
                      </span>
                      <p className="text-sm font-semibold text-[#141414]">
                        {brandName}
                      </p>
                    </div>
                  ) : null}

                  {/* Review / social link */}
                  {reviewLink ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a]">
                        Your Link
                      </span>
                      <a
                        href={reviewLink.startsWith("http") ? reviewLink : `https://${reviewLink}`}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-sm font-medium text-[#BC7C10] underline-offset-2 hover:underline"
                      >
                        {reviewLink}
                      </a>
                    </div>
                  ) : null}

                  {!hasAny ? (
                    <p className="text-sm text-[#8a8174]">
                      No additional details were saved for this order.
                    </p>
                  ) : null}
                </div>
              );
            })()}

            <div className="mt-5 border-t border-black/[0.06] pt-4">
              <div className="flex items-center justify-between text-xs text-[#8a8174]">
                <span>Order ID: {detailsOrder.id}</span>
                <span>{formatOrderDate(detailsOrder.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OrdersPanel({ orders }: { orders: HexaOrder[] }) {
  if (orders.length === 0) {
    return (
      <EmptyPanel
        icon={ShoppingBag}
        title="No orders yet"
        text="After you place an order at checkout, tracking details will appear here in Order History."
        action={{ href: "/products", label: "Browse products" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div>
          <p className="text-sm font-semibold text-[#141414]">
            {orders.length} placed order{orders.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-[#6b6560]">
            Track shipping status for every HexaCards order here.
          </p>
        </div>
        <span className="rounded-md bg-[#FFF8ED] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#9a650d] uppercase ring-1 ring-[#BC7C10]/20">
          Order History
        </span>
      </div>

      <div className="space-y-3">
        {orders.map((order) => {
          const steps = ["placed", "shipped", "delivered"] as const;
          const current = steps.indexOf(order.status);
          return (
            <article
              key={order.id}
              className="rounded-xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${statusTone(order.status)}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                    <span className="font-mono text-xs text-[#8a8174]">
                      {order.id}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-semibold text-[#141414]">
                    {order.productTitle}
                  </p>
                  <p className="mt-1 text-xs text-[#6b6560]">
                    {formatOrderDate(order.createdAt)} · {order.packTitle} · Qty{" "}
                    {order.qty}
                  </p>
                </div>
                <p className="font-dashboard text-xl font-extrabold tracking-[-0.03em] tabular-nums text-[#141414]">
                  ₹{order.total.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="mt-4 grid gap-x-6 gap-y-2 rounded-lg bg-[#FAFAF8] px-4 py-3 text-xs text-[#6b6560] sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-[#141414]">Ship to</span>
                  <br />
                  {order.customerName}
                </p>
                <p>
                  <span className="font-semibold text-[#141414]">Phone</span>
                  <br />
                  +91 {order.phone}
                </p>
                <p className="sm:col-span-2">
                  <span className="font-semibold text-[#141414]">Address</span>
                  <br />
                  {order.address}, {order.city} {order.postalCode}
                </p>
              </div>

              <div className="mt-5 flex items-center gap-2">
                {steps.map((step, i) => {
                  const done = i <= current;
                  return (
                    <div
                      key={step}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                    >
                      <div
                        className={`h-1 w-full rounded-full ${
                          done ? "bg-[#BC7C10]" : "bg-black/[0.08]"
                        }`}
                      />
                      <span
                        className={`text-[10px] font-semibold capitalize ${
                          done ? "text-[#BC7C10]" : "text-[#9a9a9a]"
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SecurityPanel({ user }: { user: HexaAuthUser }) {
  return (
    <div className="max-w-2xl overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-black/[0.06] px-5 py-4 sm:px-6">
        <p className="text-sm font-semibold">Signed-in session</p>
        <p className="mt-0.5 text-xs text-[#6b6560]">
          OTP-verified mobile login for HexaCards checkout and dashboard.
        </p>
      </div>
      <div className="grid gap-0 sm:grid-cols-2">
        <div className="border-b border-black/[0.06] px-5 py-4 sm:border-r sm:border-b-0 sm:px-6">
          <p className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
            Full name
          </p>
          <p className="mt-1 text-sm font-semibold">{user.name}</p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
            Mobile
          </p>
          <p className="mt-1 text-sm font-semibold">+91 {user.phone}</p>
        </div>
      </div>
      <div className="flex items-start gap-3 border-t border-black/[0.06] bg-[#FAFAF8] px-5 py-4 sm:px-6">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#BC7C10]" />
        <p className="text-xs leading-relaxed text-[#6b6560]">
          For security, sign out on shared devices. Your order history stays on
          this browser until cleared.
        </p>
      </div>
    </div>
  );
}

function SupportPanel() {
  return (
    <div className="max-w-2xl rounded-xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF8ED] text-[#BC7C10] ring-1 ring-[#BC7C10]/20">
          <Headphones className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-[#141414]">
              Talk to HexaCards support
            </p>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase ring-1 ring-emerald-100">
              Live
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#6b6560]">
            Need help with NFC cards, shipping, or your digital profile? Our
            team typically replies within one business day.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href="mailto:info@hexacards.com"
              className="flex items-start gap-3 rounded-xl border border-[#BC7C10]/20 bg-[#FFFCF7] p-3.5 transition hover:border-[#BC7C10]/40 hover:bg-[#FFF8ED]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#BC7C10] shadow-sm ring-1 ring-black/[0.04]">
                <Mail className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold tracking-[0.12em] text-[#BC7C10] uppercase">
                  Email
                </span>
                <span className="mt-0.5 block break-all text-sm font-semibold text-[#141414]">
                  info@hexacards.com
                </span>
              </span>
            </a>

            <div className="flex items-start gap-3 rounded-xl border border-[#BC7C10]/20 bg-[#FFFCF7] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#BC7C10] shadow-sm ring-1 ring-black/[0.04]">
                <Clock3 className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.12em] text-[#BC7C10] uppercase">
                  Business hours
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[#141414]">
                  Monday–Saturday
                </p>
                <p className="text-sm text-[#6b6560]">10:00 AM–6:00 PM</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/919226286898?text=${encodeURIComponent(
                "Hi HexaCards support, I need help with my NFC card / digital profile.",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-[#BC7C10] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#9a650d]"
            >
              Contact support
            </a>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-lg border border-black/[0.08] px-4 py-2.5 text-[13px] font-semibold text-[#141414] hover:bg-[#FAFAF8]"
            >
              View products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagesPanel({
  messages,
  onChange,
}: {
  messages: CardMessage[];
  onChange: () => void;
}) {
  if (messages.length === 0) {
    return (
      <EmptyPanel
        icon={MessageSquare}
        title="Inbox is empty"
        text="When someone fills the Contact Us form on your digital card, their message will appear here."
      />
    );
  }

  const unread = messages.filter((m) => !m.read).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div>
          <p className="text-sm font-semibold text-[#141414]">
            {messages.length} message{messages.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-[#6b6560]">
            {unread
              ? `${unread} unread from your card contact form`
              : "All caught up"}
          </p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={() => {
              markAllMessagesRead();
              onChange();
            }}
            className="rounded-lg border border-black/[0.08] px-3 py-2 text-xs font-semibold text-[#141414] hover:bg-[#FAFAF8]"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
            <thead>
              <tr className="bg-[#BC7C10]">
                <th className="w-[16%] px-3 py-3.5 text-[12px] font-bold tracking-wide text-white uppercase">
                  Name
                </th>
                <th className="w-[20%] px-3 py-3.5 text-[12px] font-bold tracking-wide text-white uppercase">
                  Email
                </th>
                <th className="w-[12%] px-3 py-3.5 text-[12px] font-bold tracking-wide text-white uppercase">
                  Phone
                </th>
                <th className="w-[36%] px-3 py-3.5 text-[12px] font-bold tracking-wide text-white uppercase">
                  Message
                </th>
                <th className="w-[9%] whitespace-nowrap px-1.5 py-3.5 text-[12px] font-bold tracking-wide text-white uppercase">
                  Date
                </th>
                <th className="w-[4%] px-0.5 py-3.5 text-center text-[12px] font-bold tracking-wide text-white uppercase">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => {
                const when = formatMessageDateShort(msg.createdAt);
                return (
                  <tr
                    key={msg.id}
                    className={`border-b border-black/[0.05] last:border-b-0 ${
                      msg.read ? "bg-white" : "bg-[#FFFCF7]"
                    } hover:bg-[#FAFAF8]`}
                    onClick={() => {
                      if (!msg.read) {
                        markMessageRead(msg.id);
                        onChange();
                      }
                    }}
                  >
                    <td className="px-3 py-3 align-top">
                      <div className="flex items-start gap-2">
                        {!msg.read ? (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#BC7C10]"
                            aria-label="Unread"
                          />
                        ) : (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0"
                            aria-hidden
                          />
                        )}
                        <span className="break-words text-sm font-semibold text-[#141414]">
                          {msg.name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {msg.email ? (
                        <a
                          href={`mailto:${msg.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="break-all text-sm text-[#141414] hover:text-[#BC7C10]"
                        >
                          {msg.email}
                        </a>
                      ) : (
                        <span className="text-sm text-[#8a8174]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top whitespace-nowrap">
                      {msg.phone ? (
                        <a
                          href={`tel:${msg.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm tabular-nums text-[#141414] hover:text-[#BC7C10]"
                        >
                          {msg.phone}
                        </a>
                      ) : (
                        <span className="text-sm text-[#8a8174]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#4a4a52]">
                        {msg.message || "—"}
                      </p>
                    </td>
                    <td className="px-1.5 py-3 align-top whitespace-nowrap">
                      <span className="block text-[11px] leading-tight tabular-nums text-[#8a8174]">
                        {when.date}
                      </span>
                      {when.time ? (
                        <span className="mt-0.5 block text-[11px] leading-tight tabular-nums text-[#8a8174]">
                          {when.time}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-0.5 py-3 align-top text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCardMessage(msg.id);
                          onChange();
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8a8174] hover:bg-[#FFF5F5] hover:text-[#E24C4C]"
                        aria-label={`Delete message from ${msg.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof MessageSquare;
  title: string;
  text: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white px-6 py-16 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAFAF8] text-[#BC7C10] ring-1 ring-black/[0.05]">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <p className="mt-4 font-dashboard text-lg font-extrabold tracking-[-0.02em] text-[#141414]">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6b6560]">
        {text}
      </p>
      {action ? (
        <Link
          href={action.href}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[#141414] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2a2a2a]"
        >
          {action.label}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
