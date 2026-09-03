import type { HexaOrder } from "@/lib/orders";

type RazorpayHandlerResponse = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

type RazorpayFailedResponse = {
  error?: {
    description?: string;
    reason?: string;
    code?: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: RazorpayFailedResponse) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay is only available in the browser."));
  }
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Razorpay checkout.")),
        { once: true },
      );
      if (window.Razorpay) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout."));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

type CompleteJson = {
  ok?: boolean;
  error?: string;
  data?: { order?: HexaOrder & Record<string, unknown> };
};

export async function confirmRazorpayPayment(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order: HexaOrder;
  clientTxnId: string;
  amount: number;
  customerId?: number | null;
}): Promise<HexaOrder> {
  const completeRes = await fetch("/api/razorpay/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id: input.razorpay_order_id,
      razorpay_payment_id: input.razorpay_payment_id,
      razorpay_signature: input.razorpay_signature,
      orderCode: input.order.id,
      orderId: input.order.orderId ?? null,
      clientTxnId: input.clientTxnId,
      amount: Number(input.amount),
      customerId: input.customerId ?? null,
    }),
  });

  const completeJson = (await completeRes.json().catch(() => null)) as CompleteJson | null;

  if (!completeRes.ok || !completeJson?.ok || !completeJson.data?.order) {
    throw new Error(
      completeJson?.error ||
        "Payment succeeded but order could not be updated. Contact support with your payment ID.",
    );
  }

  const apiOrder = completeJson.data.order;
  return {
    ...input.order,
    orderId:
      apiOrder.orderId != null && Number(apiOrder.orderId) > 0
        ? Number(apiOrder.orderId)
        : input.order.orderId,
    paymentStatus: "paid",
  };
}

export type RazorpayCheckoutInput = {
  order: HexaOrder;
  amount: number;
  customerId?: number | null;
  customerName: string;
  email: string;
  contactPhone: string;
  onPaid: (order: HexaOrder) => void | Promise<void>;
  onFailed: (reason?: string) => void | Promise<void>;
};

/**
 * Create a Razorpay order, open checkout, and run success/failure callbacks.
 */
export async function startRazorpayCheckout(
  input: RazorpayCheckoutInput,
): Promise<void> {
  await loadRazorpayScript();

  const { order, amount, customerId, customerName, email, contactPhone } = input;
  const clientTxnId =
    order.clientTxnId ?? `ord_${order.id}_${Date.now().toString(36)}`;

  const createRes = await fetch("/api/razorpay/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Number(amount),
      currency: "INR",
      orderId: String(order.orderId ?? order.id),
      clientTxnId,
      receipt: clientTxnId,
    }),
  });

  const createJson = (await createRes.json().catch(() => null)) as
    | {
        ok?: boolean;
        data?: {
          key?: string;
          orderId?: string;
          amount?: number;
          currency?: string;
        };
        error?: string;
      }
    | null;

  if (!createRes.ok || !createJson?.ok || !createJson.data?.orderId) {
    throw new Error(createJson?.error || "Razorpay checkout could not be started.");
  }

  await fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientTxnId,
      amount: Number(amount),
      customerId: customerId ?? order.userId ?? null,
      gatewayOrderId: createJson.data.orderId,
      orderId: order.orderId ?? null,
      status: "pending",
      remark: `Order ${order.id} · Razorpay checkout opened`,
    }),
  });

  const razorpayKey = createJson.data.key;
  if (!razorpayKey || !window.Razorpay) {
    throw new Error("Razorpay is not ready. Please try again.");
  }

  let settled = false;
  const finishFailed = async (reason?: string) => {
    if (settled) return;
    settled = true;
    if (order.orderId) {
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientTxnId,
          amount: Number(amount),
          customerId: customerId ?? order.userId ?? null,
          remark: reason
            ? `Order ${order.id} payment failed: ${reason}`
            : `Order ${order.id} payment failed`,
          status: "failed",
          orderId: order.orderId,
          txnAt: new Date().toISOString(),
        }),
      });
    }
    await input.onFailed(reason);
  };

  const paymentWindow = new window.Razorpay({
    key: razorpayKey,
    amount: createJson.data.amount,
    currency: createJson.data.currency || "INR",
    order_id: createJson.data.orderId,
    name: "HexaCards",
    description: order.productTitle,
    handler: (response: RazorpayHandlerResponse) => {
      if (settled) return;
      if (
        !response.razorpay_order_id ||
        !response.razorpay_payment_id ||
        !response.razorpay_signature
      ) {
        void finishFailed("Incomplete payment response from Razorpay.");
        return;
      }

      const paidOrder: HexaOrder = {
        ...order,
        paymentStatus: "paid",
      };
      settled = true;
      void Promise.resolve(input.onPaid(paidOrder));

      void confirmRazorpayPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        order,
        clientTxnId,
        amount: Number(amount),
        customerId: customerId ?? null,
      }).catch((err) => {
        console.error("Razorpay success handler failed", err);
      });
    },
    prefill: {
      name: customerName,
      email,
      contact: contactPhone,
    },
    notes: {
      orderId: order.id,
      clientTxnId,
    },
    theme: {
      color: "#BC7C10",
    },
    modal: {
      ondismiss: () => {
        void finishFailed("Payment cancelled");
      },
    },
  });

  paymentWindow.on("payment.failed", (response) => {
    const reason =
      response.error?.description ||
      response.error?.reason ||
      "Payment failed";
    void finishFailed(reason);
  });

  paymentWindow.open();
}
