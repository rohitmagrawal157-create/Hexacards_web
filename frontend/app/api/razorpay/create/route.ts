import crypto from "node:crypto";
import Razorpay from "razorpay";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getRazorpayKeys() {
  const keyId =
    process.env.RAZORPAY_KEY_ID?.trim() ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return { keyId, keySecret };
}

export async function POST(request: Request) {
  try {
    const { keyId, keySecret } = getRazorpayKeys();
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount ?? 0);
    const currency = String(body.currency ?? "INR");
    const orderId = String(body.orderId ?? body.order_id ?? "").trim();
    const receipt = String(body.receipt ?? body.clientTxnId ?? `order_${Date.now()}`).slice(0, 40);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
    }

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel → Settings → Environment Variables, then redeploy.",
        },
        { status: 500 },
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes: {
        orderId,
        receipt,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key: keyId,
        receipt: rzpOrder.receipt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Razorpay order";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { keySecret } = getRazorpayKeys();
    const body = await request.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ ok: false, error: "Missing Razorpay verification fields" }, { status: 400 });
    }

    if (!keySecret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Razorpay keys are not configured. Set RAZORPAY_KEY_SECRET on the server (Vercel env), then redeploy.",
        },
        { status: 500 },
      );
    }

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(razorpay_signature, "hex");
    const valid = expectedBuffer.length === signatureBuffer.length
      && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

    return NextResponse.json({
      ok: valid,
      data: {
        valid,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify Razorpay payment";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
