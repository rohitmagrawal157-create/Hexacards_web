"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  LayoutDashboard,
  Mail,
  Phone,
  User,
} from "lucide-react";
import {
  getAuthUser,
  isLoggedIn,
  isValidIndianPhone,
  loginPathWithNext,
  normalizeIndianPhone,
} from "@/lib/auth";
import { getProduct } from "@/lib/product-catalog";
import {
  formatOrderDate,
  saveOrder,
  updateOrder,
  type HexaOrder,
} from "@/lib/orders";
import { initOrderCardProfile } from "@/lib/order-card-profile";
import { buildOrderCardSlug } from "@/lib/order-card";
import { savedDesignToCardDesign } from "@/lib/user-cards";

const PRODUCT_ID = "digital-profile-qr";
const DRAFT_KEY = "hexaDigitalQrOrder";

type ContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type FormErrors = Partial<Record<keyof ContactDraft, string>>;

function currency(amount: number) {
  return `₹${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function emptyDraft(): ContactDraft {
  return { firstName: "", lastName: "", email: "", phone: "" };
}

function readDraft(): ContactDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ContactDraft;
  } catch {
    return null;
  }
}

function writeDraft(draft: ContactDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export default function DigitalQrOrderForm() {
  const router = useRouter();
  const product = getProduct(PRODUCT_ID);
  const thumb =
    product.media.find((m) => m.type === "image") ?? product.media[0];
  const thumbSrc = thumb.type === "image" ? thumb.src : thumb.thumbnail;

  const [form, setForm] = useState<ContactDraft>(emptyDraft);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<HexaOrder | null>(null);

  useEffect(() => {
    const draft = readDraft();
    if (draft) setForm(draft);

    const auth = getAuthUser();
    if (!auth) return;
    setForm((prev) => ({
      firstName: prev.firstName || auth.name.split(" ")[0] || "",
      lastName:
        prev.lastName || auth.name.split(" ").slice(1).join(" ") || "",
      email: prev.email,
      phone: prev.phone || auth.phone || "",
    }));
  }, []);

  const fullName = useMemo(
    () => `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
    [form.firstName, form.lastName],
  );

  function updateField<K extends keyof ContactDraft>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.firstName.trim()) next.firstName = "First name is required.";
    if (!form.lastName.trim()) next.lastName = "Last name is required.";
    if (!form.email.trim()) {
      next.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!form.phone.trim()) {
      next.phone = "Phone number is required.";
    } else if (!isValidIndianPhone(form.phone)) {
      next.phone = "Enter a valid 10-digit Indian mobile number.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function placeOrder(draft: ContactDraft) {
    const auth = getAuthUser();
    if (!auth?.phone) {
      writeDraft(draft);
      router.push(loginPathWithNext(`/order/${PRODUCT_ID}`));
      return;
    }

    setSubmitting(true);
    try {
      const contactPhone =
        normalizeIndianPhone(draft.phone) || auth.phone;
      const customerName =
        `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim() ||
        auth.name;
      const cardDesign = savedDesignToCardDesign(
        { title: customerName, hasLogo: false },
        customerName,
        contactPhone,
      );

      const order = await saveOrder({
        ownerPhone: auth.phone,
        customerName,
        phone: contactPhone,
        email: draft.email.trim(),
        address: "",
        city: "",
        postalCode: "",
        country: "IN",
        packTitle: "1 Digital Profile + QR",
        qty: 1,
        subtotal: product.price,
        discount: 0,
        total: product.price,
        coupon: null,
        productTitle: product.shortTitle,
        productId: PRODUCT_ID,
        status: "placed",
        cardDesign,
      });

      const cardName = cardDesign?.name || customerName;
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
      clearDraft();
      setPlacedOrder(finalized);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Failed to place Digital QR order", err);
      window.alert(
        err instanceof Error
          ? err.message
          : "Could not place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || submitting) return;

    writeDraft(form);

    if (!isLoggedIn()) {
      router.push(loginPathWithNext(`/order/${PRODUCT_ID}`));
      return;
    }

    await placeOrder(form);
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
            Your Digital Profile + QR order is placed. Edit your profile anytime
            from My Cards.
          </p>

          <div className="mt-6 rounded-xl border border-black/[0.06] bg-[#FFFCF7] p-4 text-left text-sm">
            <p className="font-bold text-[#141414]">{placedOrder.productTitle}</p>
            <p className="mt-1 text-[#5c5346]">
              Order ID:{" "}
              <span className="font-semibold text-[#141414]">
                {placedOrder.id}
              </span>
            </p>
            <p className="text-[#5c5346]">
              Placed: {formatOrderDate(placedOrder.createdAt)}
            </p>
            <p className="pt-1 text-base font-bold text-[#141414]">
              Total: {currency(placedOrder.total)}
            </p>
          </div>

          <Link
            href="/dashboard?tab=cards"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#BC7C10] px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d]"
          >
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/product/digital-profile-qr"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5c5346] hover:text-[#141414]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to product
        </Link>
      </div>

      <div className="mb-6 flex items-start gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#FAFAF8] ring-1 ring-black/[0.06]">
          <Image
            src={thumbSrc}
            alt={product.shortTitle}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            Digital Profile + QR
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-[#141414] sm:text-2xl">
            {product.shortTitle}
          </h1>
          <p className="mt-1 text-sm text-[#5c5346]">
            Enter your contact details to place your order —{" "}
            <span className="font-semibold text-[#141414]">
              {currency(product.price)}
            </span>
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-7"
      >
        <h2 className="text-lg font-bold text-[#141414]">Contact information</h2>
        <p className="mt-1 text-sm text-[#5c5346]">
          We&apos;ll use these details for your Digital Profile + QR order.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#141414]">
              <User className="h-3.5 w-3.5 text-[#BC7C10]" />
              First name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="e.g. Rahul"
              className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3.5 py-2.5 text-sm text-[#141414] placeholder:text-[#8a8174]/70 focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
              autoComplete="given-name"
            />
            {errors.firstName ? (
              <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#141414]">
              <User className="h-3.5 w-3.5 text-[#BC7C10]" />
              Last name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="e.g. Sharma"
              className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3.5 py-2.5 text-sm text-[#141414] placeholder:text-[#8a8174]/70 focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
              autoComplete="family-name"
            />
            {errors.lastName ? (
              <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
            ) : null}
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#141414]">
              <Mail className="h-3.5 w-3.5 text-[#BC7C10]" />
              Email <span className="text-red-500">*</span>
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3.5 py-2.5 text-sm text-[#141414] placeholder:text-[#8a8174]/70 focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
              autoComplete="email"
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            ) : null}
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#141414]">
              <Phone className="h-3.5 w-3.5 text-[#BC7C10]" />
              Phone number <span className="text-red-500">*</span>
            </span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3.5 py-2.5 text-sm text-[#141414] placeholder:text-[#8a8174]/70 focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
              autoComplete="tel"
              inputMode="numeric"
            />
            {errors.phone ? (
              <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
            ) : null}
          </label>
        </div>

        {fullName ? (
          <p className="mt-4 text-xs text-[#8a8174]">
            Ordering as{" "}
            <span className="font-semibold text-[#141414]">{fullName}</span>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#BC7C10] px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>

        <p className="mt-3 text-center text-xs text-[#8a8174]">
          You&apos;ll need to sign in with your phone to confirm the order.
        </p>
      </form>
    </div>
  );
}
