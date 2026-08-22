import { NextResponse } from "next/server";
import { getRecaptchaSecretKey } from "@/lib/recaptcha-server";

type GoogleVerifyResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
};

/**
 * Verifies an Invisible reCAPTCHA v2 token with Google.
 * Secret key never leaves the server.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing reCAPTCHA token" },
        { status: 400 },
      );
    }

    const secret = getRecaptchaSecretKey();
    if (!secret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "reCAPTCHA is not configured. Set RECAPTCHA_SECRET_KEY on the server.",
        },
        { status: 503 },
      );
    }

    const params = new URLSearchParams({
      secret,
      response: token,
    });

    const googleRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );

    const result = (await googleRes.json()) as GoogleVerifyResponse;
    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "reCAPTCHA check failed. Please try again.",
          codes: result["error-codes"] ?? [],
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not verify reCAPTCHA right now." },
      { status: 500 },
    );
  }
}
