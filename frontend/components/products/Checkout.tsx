"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Minus,
  Plus,
  LayoutDashboard,
  Package,
} from "lucide-react";
import {
  getAuthUser,
  isLoggedIn,
  loginPathWithNext,
  normalizeIndianPhone,
} from "@/lib/auth";
import {
  formatOrderDate,
  saveOrder,
  updateOrder,
  type HexaOrder,
} from "@/lib/orders";
import { initOrderCardProfile } from "@/lib/order-card-profile";
import { buildOrderCardSlug } from "@/lib/order-card";
import {
  resolveLogoForOrder,
  savedDesignToCardDesign,
  type SavedCardDesign,
} from "@/lib/user-cards";

type CartItem = {
  id: string;
  title: string;
  image: string;
  price: number;
  qty: number;
};

type PackOption = {
  id: "1" | "2" | "3";
  qty: number;
  title: string;
  subtitle: string;
  price: number;
  badge?: string;
};

type SavedDesign = SavedCardDesign;

const PACK_OPTIONS: PackOption[] = [
  {
    id: "1",
    qty: 1,
    title: "1 Card",
    subtitle: "One Smart NFC Card",
    price: 799,
  },
  {
    id: "2",
    qty: 2,
    title: "2 Cards",
    subtitle: "Pack of 2 NFC Smart cards",
    price: 1299,
    badge: "Popular",
  },
  {
    id: "3",
    qty: 3,
    title: "3 Cards",
    subtitle: "Pack of 3 NFC Smart Cards",
    price: 1499,
    badge: "Best Value",
  },
];

const PROMO_CODES: Record<string, { label: string; percentOff: number }> = {
  WELCOME10: { label: "WELCOME10", percentOff: 10 },
};

function currency(amount: number) {
  return `₹${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

const NON_CARD_PRODUCT_IDS_CHECKOUT = new Set([
  "google-standee", "instagram-standee", "youtube-standee", "review-stand",
  "google-stand", "instagram-card", "youtube-card", "google-review-card",
  "google-reviews", "social-media-card", "review-keychain-qr",
]);

export default function Checkout() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [design, setDesign] = useState<SavedDesign | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "IN",
  });
  const [sameBilling, setSameBilling] = useState(true);
  const [selectedPackId, setSelectedPackId] = useState<PackOption["id"]>("1");
  const [packCount, setPackCount] = useState(1);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    label: string;
    percentOff: number;
  } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<HexaOrder | null>(null);
  const [orderProductId, setOrderProductId] = useState<string | undefined>(undefined);
  const [orderDetails, setOrderDetails] = useState<{
    productTitle?: string;
    image?: string;
    businessName?: string;
    link?: string;
    logoDataUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace(loginPathWithNext("/checkout"));
      return;
    }
    const user = getAuthUser();
    if (user) {
      const parts = user.name.trim().split(/\s+/);
      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ");
      setForm((f) => ({
        ...f,
        phone: f.phone || normalizeIndianPhone(user.phone),
        firstName: f.firstName || firstName,
        lastName: f.lastName || lastName,
      }));
    }
    setAuthReady(true);
  }, [router]);

  // If user logs out while we're already on checkout, redirect them
  // to login so checkout is not shown to logged-out users.
  useEffect(() => {
    function onAuthChange() {
      if (!isLoggedIn()) {
        setAuthReady(false);
        router.replace(loginPathWithNext("/checkout"));
      } else {
        setAuthReady(true);
      }
    }

    window.addEventListener("hexa-auth-change", onAuthChange);
    return () => window.removeEventListener("hexa-auth-change", onAuthChange);
  }, [router]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("hexaCardDesign");
      if (raw) setDesign(JSON.parse(raw) as SavedDesign);
    } catch {
      // ignore
    }
    try {
      const detailsRaw = sessionStorage.getItem("hexaOrderDetails");
      if (detailsRaw) {
        const details = JSON.parse(detailsRaw) as {
          productId?: string;
          productTitle?: string;
          image?: string;
          businessName?: string;
          link?: string;
          logoDataUrl?: string;
        };
        if (details.productId) setOrderProductId(details.productId);
        if (details.productTitle || details.image) {
          setOrderDetails({
            productTitle: details.productTitle,
            image: details.image,
            businessName: details.businessName,
            link: details.link,
            logoDataUrl: details.logoDataUrl,
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const selectedPack =
    PACK_OPTIONS.find((p) => p.id === selectedPackId) ?? PACK_OPTIONS[0];

  const lineQty = selectedPack.qty * packCount;
  const linePrice = selectedPack.price * packCount;

  const cartItems = useMemo((): CartItem[] => {
    const name = design?.title?.trim();
    // For standee/social media orders, use the real product title + image
    if (orderDetails?.productTitle) {
      return [
        {
          id: orderProductId ?? "hexa-product",
          title: name
            ? `${orderDetails.productTitle} — ${name}`
            : orderDetails.productTitle,
          image: orderDetails.image ?? "/Images/Products/digitalCard.jpg",
          price: linePrice,
          qty: lineQty,
        },
      ];
    }
    return [
      {
        id: "hexa-nfc-card",
        title: name ? `Hexa NFC Card — ${name}` : "Hexa NFC Business Card",
        image: "/Images/Products/digitalCard.jpg",
        price: linePrice,
        qty: lineQty,
      },
    ];
  }, [design, orderDetails, orderProductId, linePrice, lineQty]);

  function updateField<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function bumpPackCount(delta: number) {
    setPackCount((n) => Math.min(10, Math.max(1, n + delta)));
  }

  const subtotal = linePrice;

  const discountAmount = appliedCoupon
    ? Math.round(subtotal * (appliedCoupon.percentOff / 100))
    : 0;

  const total = Math.max(0, subtotal - discountAmount);

  function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    const match = PROMO_CODES[code];
    if (match) {
      setAppliedCoupon(match);
      setCouponMessage({
        text: `"${match.label}" applied — ${match.percentOff}% off`,
        ok: true,
      });
    } else {
      setAppliedCoupon(null);
      setCouponMessage({
        text: "That code isn't valid or has expired.",
        ok: false,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreedToTerms || isSubmitting) return;

    const auth = getAuthUser();
    if (!auth?.phone) {
      router.replace(loginPathWithNext("/checkout"));
      return;
    }

    setIsSubmitting(true);

    try {
      const productTitle = cartItems[0]?.title ?? "Hexa NFC Business Card";
      const contactPhone =
        normalizeIndianPhone(form.phone) || auth.phone;
      const customerName = `${form.firstName} ${form.lastName}`.trim();
      const logoSrc = await resolveLogoForOrder(design);
      const cardDesign = savedDesignToCardDesign(
        design,
        customerName,
        contactPhone,
        logoSrc,
      );
      const cardName = cardDesign?.name || customerName;

      const order = await saveOrder({
        ownerPhone: auth.phone,
        customerName,
        phone: contactPhone,
        email: form.email,
        address: form.address,
        city: form.city,
        postalCode: form.postalCode,
        country: form.country,
        packTitle: selectedPack.title,
        qty: lineQty,
        subtotal,
        discount: discountAmount,
        total,
        coupon: appliedCoupon?.label ?? null,
        productTitle,
        productId: orderProductId,
        status: "placed",
        // Only NFC / business card orders carry a digital card design
        cardDesign: orderProductId && NON_CARD_PRODUCT_IDS_CHECKOUT.has(orderProductId)
          ? undefined
          : cardDesign,
        jobTitle: design?.subTitle?.trim() || undefined,
        // Standee / social-media order details
        businessName: orderDetails?.businessName || undefined,
        reviewLink: orderDetails?.link || undefined,
        orderLogoSrc: orderDetails?.logoDataUrl || undefined,
      });

      const finalSlug = buildOrderCardSlug(cardName, contactPhone, order.id);
      const liveUrl = `https://hexacards.com/${finalSlug}`;
      const finalized =
        updateOrder(order.id, {
          cardSlug: finalSlug,
          cardUrl: liveUrl,
          cardDesign: cardDesign
            ? { ...cardDesign, liveUrl }
            : undefined,
        }) ?? order;

      initOrderCardProfile(finalized);

      try {
        sessionStorage.removeItem("hexaCardDesign");
        sessionStorage.removeItem("hexaOrderDetails");
      } catch {
        // ignore
      }

      setPlacedOrder(finalized);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to place order", err);
      const message =
        err instanceof Error && /storage|quota/i.test(err.message)
          ? err.message
          : "Could not place your order. Please sign in again and retry.";
      window.alert(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const finishLabel = design
    ? design.cardBody === "white"
      ? `White card · ${design.accentColor ?? "custom"} accent`
      : `Black card · ${design.cardMode ?? "gold"} finish`
    : null;

  if (!authReady) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-[#5c5346]">
          Checking sign-in…
        </p>
      </div>
    );
  }

  if (placedOrder) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="rounded-2xl border border-black/[0.06] bg-white p-6 text-center shadow-sm sm:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </span>
          <p className="mt-5 text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            Order confirmed
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141414]">
            Thank you!
          </h1>
          <p className="mt-2 text-sm text-[#5c5346]">
            Your HexaCards order is placed. Your new card is now in My Cards on
            your dashboard.
          </p>

          <div className="mt-6 rounded-xl border border-black/[0.06] bg-[#FFFCF7] p-4 text-left">
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-5 w-5 shrink-0 text-[#BC7C10]" />
              <div className="min-w-0 flex-1 space-y-1.5 text-sm">
                <p className="font-bold text-[#141414]">
                  {placedOrder.productTitle}
                </p>
                <p className="text-[#5c5346]">
                  Order ID:{" "}
                  <span className="font-semibold text-[#141414]">
                    {placedOrder.id}
                  </span>
                </p>
                <p className="text-[#5c5346]">
                  {placedOrder.packTitle} · Qty {placedOrder.qty}
                </p>
                <p className="text-[#5c5346]">
                  Placed: {formatOrderDate(placedOrder.createdAt)}
                </p>
                <p className="pt-1 text-base font-bold text-[#141414]">
                  Total: {currency(placedOrder.total)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard?tab=cards"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#BC7C10] px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d]"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
            >
              Continue shopping
            </Link>
          </div>

          <p className="mt-5 text-xs text-[#8a8174]">
            Use Dashboard → My Cards to view your card, or Order History to track shipping.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/products");
            }
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#BC7C10] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      </div>

      <div className="mb-8 text-center">
        <p className="text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
          Order
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[#141414]">Checkout</h1>
        <p className="mt-1 text-[#5c5346]">
          Complete your Hexa card order in a few steps
        </p>
      </div>

      {design ? (
        <div className="mb-6 rounded-2xl border border-[#BC7C10]/20 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-bold tracking-wide text-[#BC7C10] uppercase">
            Your card design
          </p>
          <div className="mt-2 grid gap-1 text-sm text-[#5c5346] sm:grid-cols-2">
            <p>
              <span className="font-semibold text-[#141414]">Name:</span>{" "}
              {design.title?.trim() || "—"}
            </p>
            <p>
              <span className="font-semibold text-[#141414]">Subtitle:</span>{" "}
              {design.subTitle?.trim() || "—"}
            </p>
            <p>
              <span className="font-semibold text-[#141414]">Finish:</span>{" "}
              {finishLabel}
            </p>
            <p>
              <span className="font-semibold text-[#141414]">Logo:</span>{" "}
              {design.hasLogo ? "Uploaded" : "Not uploaded"}
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-[#141414]">
                Contact Information
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="first-name"
                    className="mb-2 block text-sm font-medium text-[#5c5346]"
                  >
                    First Name *
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 transition-colors focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="last-name"
                    className="mb-2 block text-sm font-medium text-[#5c5346]"
                  >
                    Last Name *
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 transition-colors focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#5c5346]"
                >
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 transition-colors focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 focus:outline-none"
                />
              </div>

              <div className="mt-4">
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-[#5c5346]"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) =>
                    updateField(
                      "phone",
                      normalizeIndianPhone(e.target.value),
                    )
                  }
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 transition-colors focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-[#8a8174]">
                  Linked to your HexaCards login so the order shows in your
                  dashboard.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-[#141414]">
                Shipping Address
              </h2>

              <div>
                <label
                  htmlFor="address"
                  className="mb-2 block text-sm font-medium text-[#5c5346]"
                >
                  Address *
                </label>
                <input
                  id="address"
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 transition-colors focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 focus:outline-none"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="city"
                    className="mb-2 block text-sm font-medium text-[#5c5346]"
                  >
                    City *
                  </label>
                  <input
                    id="city"
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 transition-colors focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="postal"
                    className="mb-2 block text-sm font-medium text-[#5c5346]"
                  >
                    PIN Code *
                  </label>
                  <input
                    id="postal"
                    type="text"
                    required
                    value={form.postalCode}
                    onChange={(e) => updateField("postalCode", e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 transition-colors focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="country"
                  className="mb-2 block text-sm font-medium text-[#5c5346]"
                >
                  Country *
                </label>
                <select
                  id="country"
                  required
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 transition-colors focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 focus:outline-none"
                >
                  <option value="IN">India</option>
                  <option value="AE">United Arab Emirates</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                </select>
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[#5c5346]">
                <input
                  type="checkbox"
                  checked={sameBilling}
                  onChange={(e) => setSameBilling(e.target.checked)}
                  className="rounded border-black/20 text-[#BC7C10] focus:ring-[#BC7C10]"
                />
                Billing address same as shipping
              </label>
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-[#141414]">
                <CreditCard className="h-5 w-5 text-[#BC7C10]" />
                Payment Method
              </h2>
              <p className="text-sm text-[#5c5346]">
                Payment integration coming next. Your design & order details are
                saved — complete the form to continue.
              </p>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFFCF7] p-3 text-sm text-[#5c5346] ring-1 ring-black/[0.04]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#BC7C10]" />
                Your card data is never stored on our servers. Secure checkout
                will use an encrypted payment provider.
              </div>
            </div>
          </div>

          <div>
            <div className="sticky top-28 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#141414]">
                Order Summary
              </h3>

              <div className="mt-4 space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#BC7C10]/10 ring-1 ring-[#BC7C10]/25">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#141414]">
                        {item.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs text-[#5c5346]">Qty</span>
                        <div className="inline-flex items-center rounded-full border border-[#BC7C10]/30 bg-[#FFFCF7]">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => bumpPackCount(-1)}
                            disabled={packCount <= 1}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[#BC7C10] transition-colors hover:bg-[#BC7C10]/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-xs font-bold text-[#141414]">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => bumpPackCount(1)}
                            disabled={packCount >= 10}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[#BC7C10] transition-colors hover:bg-[#BC7C10]/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-sm font-bold text-[#BC7C10]">
                        {currency(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-2.5" role="radiogroup" aria-label="Pack size">
                {PACK_OPTIONS.map((pack) => {
                  const selected = selectedPackId === pack.id;
                  return (
                    <div
                      key={pack.id}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={0}
                      onClick={() => setSelectedPackId(pack.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedPackId(pack.id);
                        }
                      }}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                        selected
                          ? "border-2 border-[#BC7C10] bg-[#FFF8ED]"
                          : "border border-black/10 bg-white hover:border-[#BC7C10]/35"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? "border-[#BC7C10]" : "border-black/25"
                        }`}
                        aria-hidden
                      >
                        {selected ? (
                          <span className="h-2 w-2 rounded-full bg-[#BC7C10]" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-[#141414]">
                            {pack.title}
                          </span>
                          {pack.badge ? (
                            <span className="rounded-full bg-[#22c55e] px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                              {pack.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#5c5346]">
                          {pack.subtitle}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-sm font-bold text-[#141414]">
                          {currency(pack.price)}
                        </span>
                        {/* {selected ? (
                          <span
                            className="inline-flex items-center rounded-full border border-[#BC7C10]/30 bg-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              aria-label="Decrease packs"
                              onClick={() => bumpPackCount(-1)}
                              disabled={packCount <= 1}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[#BC7C10] hover:bg-[#BC7C10]/10 disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3" strokeWidth={2.5} />
                            </button>
                            <span className="min-w-[1.25rem] text-center text-[11px] font-bold text-[#141414]">
                              {packCount}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase packs"
                              onClick={() => bumpPackCount(1)}
                              disabled={packCount >= 10}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[#BC7C10] hover:bg-[#BC7C10]/10 disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" strokeWidth={2.5} />
                            </button>
                          </span>
                        ) : null} */}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-[#5c5346]">
                Free delivery · 4–6 business days
              </p>

              <div className="mt-4 space-y-3 border-t border-black/[0.06] pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#5c5346]">Subtotal</span>
                  <span className="font-medium">{currency(subtotal)}</span>
                </div>

                {appliedCoupon ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5c5346]">
                      Discount{" "}
                      <span className="ml-1 rounded bg-green-100 px-1 text-xs text-green-800">
                        {appliedCoupon.label}
                      </span>
                    </span>
                    <span className="font-medium text-green-700">
                      -{currency(discountAmount)}
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between text-sm">
                  <span className="text-[#5c5346]">Delivery</span>
                  <span className="font-medium text-green-700">Free</span>
                </div>

                <div className="border-t border-black/[0.06] pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{currency(total)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#141414] transition-colors hover:border-[#BC7C10]/35 hover:text-[#BC7C10]"
                  >
                    Apply
                  </button>
                </div>
                {couponMessage ? (
                  <p
                    className={`mt-2 text-xs ${
                      couponMessage.ok ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {couponMessage.text}
                  </p>
                ) : null}
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-2 text-xs text-[#5c5346]">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded border-black/20 text-[#BC7C10] focus:ring-[#BC7C10]"
                />
                I agree to the terms of sale and privacy policy.
              </label>

              <button
                type="submit"
                disabled={!agreedToTerms || isSubmitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#BC7C10] py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  "Processing…"
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Place Order · {currency(total)}
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-[11px] text-[#5c5346]">
                Secure Checkout · HexaCards
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
