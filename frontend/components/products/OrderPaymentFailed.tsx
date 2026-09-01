"use client";

import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

type OrderPaymentFailedProps = {
  orderId?: string;
  retryHref?: string;
};

export default function OrderPaymentFailed({
  orderId,
  retryHref = "/order/digital-profile-qr",
}: OrderPaymentFailedProps) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="rounded-2xl border border-red-200/80 bg-white p-6 text-center shadow-sm sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-600">
          <AlertCircle className="h-9 w-9" />
        </span>
        <p className="mt-5 text-xs font-bold tracking-[0.14em] text-red-600 uppercase">
          Payment not completed
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141414]">
          Sorry, payment failed
        </h1>
        <p className="mt-2 text-sm text-[#5c5346]">
          Your payment could not be processed. No amount was charged, or any
          charge will be reversed automatically. Please try again.
        </p>

        {orderId ? (
          <p className="mt-4 text-xs text-[#8a8174]">
            Reference:{" "}
            <span className="font-semibold text-[#141414]">{orderId}</span>
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href={retryHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#BC7C10] px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d]"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </Link>
          <Link
            href="/dashboard?tab=orders"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
          >
            View orders
          </Link>
        </div>

        <p className="mt-5 text-xs text-[#8a8174]">
          Need help? Contact us on WhatsApp with your order reference.
        </p>
      </div>
    </div>
  );
}
