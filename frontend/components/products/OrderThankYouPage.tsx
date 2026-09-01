"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import OrderPaymentFailed from "@/components/products/OrderPaymentFailed";
import OrderThankYou from "@/components/products/OrderThankYou";
import {
  readOrderThankYouSummary,
  type OrderThankYouSummary,
} from "@/lib/order-thank-you";

export default function OrderThankYouPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order")?.trim() ?? "";
  const status = searchParams.get("status")?.trim().toLowerCase() ?? "";
  const retryHref = searchParams.get("retry")?.trim() || undefined;
  const [order, setOrder] = useState<OrderThankYouSummary | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setReady(true);
      return;
    }

    if (status !== "failed") {
      setOrder(readOrderThankYouSummary(orderId));
    }
    setReady(true);
  }, [orderId, status]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-[#5c5346]">
        Loading your order…
      </div>
    );
  }

  if (status === "failed") {
    return (
      <OrderPaymentFailed
        orderId={orderId || undefined}
        retryHref={retryHref}
      />
    );
  }

  if (order) {
    return <OrderThankYou order={order} />;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 text-center shadow-sm sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-[#141414]">
          Thank you!
        </h1>
        <p className="mt-2 text-sm text-[#5c5346]">
          {orderId
            ? "We could not load this order summary. Check your dashboard for order details."
            : "Your order may already be complete. Open your dashboard to view your cards."}
        </p>
        <Link
          href="/dashboard?tab=cards"
          className="mt-6 inline-flex rounded-xl bg-[#BC7C10] px-5 py-3 text-sm font-bold text-white hover:bg-[#9a650d]"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
