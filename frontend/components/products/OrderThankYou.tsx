"use client";

import Link from "next/link";
import { CheckCircle2, LayoutDashboard, Package } from "lucide-react";
import type { OrderThankYouSummary } from "@/lib/order-thank-you";
import { formatOrderDate } from "@/lib/orders";

function currency(amount: number) {
  return `₹${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

type OrderThankYouProps = {
  order: OrderThankYouSummary;
  description?: string;
};

export default function OrderThankYou({ order, description }: OrderThankYouProps) {
  const defaultDescription =
    order.paymentStatus === "paid"
      ? "Your payment was successful. Your new card is now in My Cards on your dashboard."
      : "Your HexaCards order is placed. Your new card is now in My Cards on your dashboard.";

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
          {description ?? defaultDescription}
        </p>

        <div className="mt-6 rounded-xl border border-black/[0.06] bg-[#FFFCF7] p-4 text-left">
          <div className="flex items-start gap-3">
            <Package className="mt-0.5 h-5 w-5 shrink-0 text-[#BC7C10]" />
            <div className="min-w-0 flex-1 space-y-1.5 text-sm">
              <p className="font-bold text-[#141414]">{order.productTitle}</p>
              <p className="text-[#5c5346]">
                Order ID:{" "}
                <span className="font-semibold text-[#141414]">{order.id}</span>
              </p>
              {order.packTitle ? (
                <p className="text-[#5c5346]">
                  {order.packTitle} · Qty {order.qty}
                </p>
              ) : null}
              <p className="text-[#5c5346]">
                Placed: {formatOrderDate(order.createdAt)}
              </p>
              <p className="pt-1 text-base font-bold text-[#141414]">
                Total: {currency(order.total)}
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
          Use Dashboard → My Cards to view your card, or Order History to track
          shipping.
        </p>
      </div>
    </div>
  );
}
