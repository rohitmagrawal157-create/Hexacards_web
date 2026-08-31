import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getRazorpayKeys() {
  const keyId =
    process.env.RAZORPAY_KEY_ID?.trim() ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return { keyId, keySecret };
}

/**
 * GET /api/razorpay/status
 * Safe check for deployment — never returns secrets.
 */
export async function GET() {
  const { keyId, keySecret } = getRazorpayKeys();
  const configured = Boolean(keyId && keySecret);

  return NextResponse.json({
    ok: true,
    configured,
    keyIdSet: Boolean(keyId),
    keySecretSet: Boolean(keySecret),
    keyIdPrefix: keyId ? `${keyId.slice(0, 12)}…` : null,
    hint: configured
      ? "Razorpay keys are loaded on this deployment."
      : "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel → Settings → Environment Variables (Production), then Redeploy.",
  });
}
