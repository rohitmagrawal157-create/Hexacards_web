"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Smartphone, ShieldCheck, UserRound } from "lucide-react";
import {
  clearAuthUser,
  getAuthUser,
  isValidIndianPhone,
  issueDemoOtp,
  normalizeIndianPhone,
  setAuthUser,
  verifyDemoOtp,
  type HexaAuthUser,
} from "@/lib/auth";

type Step = "phone" | "otp";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [step, setStep] = useState<Step>("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [existing, setExisting] = useState<HexaAuthUser | null>(null);

  useEffect(() => {
    const user = getAuthUser();
    if (user) setExisting(user);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const phoneDigits = useMemo(() => normalizeIndianPhone(phone), [phone]);

  function sendOtp() {
    setError("");
    setInfo("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!isValidIndianPhone(phoneDigits)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    try {
      const code = issueDemoOtp(phoneDigits);
      setStep("otp");
      setOtp("");
      setResendIn(30);
      setInfo(`OTP sent to +91 ${phoneDigits}. Demo code: ${code}`);
    } finally {
      setBusy(false);
    }
  }

  function verifyOtp() {
    setError("");
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setBusy(true);
    try {
      if (!verifyDemoOtp(phoneDigits, otp)) {
        setError("Invalid or expired OTP. Try again.");
        return;
      }
      setAuthUser(phoneDigits, name.trim());
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    } finally {
      setBusy(false);
    }
  }

  function continueAsLoggedIn() {
    router.replace(nextPath.startsWith("/") ? nextPath : "/");
  }

  function switchAccount() {
    clearAuthUser();
    setExisting(null);
    setStep("phone");
    setName("");
    setPhone("");
    setOtp("");
    setInfo("");
    setError("");
  }

  return (
    <section className="bg-[#FFFCF7]">
      <div className="border-b border-black/[0.06] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3 sm:px-8 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase sm:text-xs">
              Account
            </p>
            <h1 className="text-base font-extrabold tracking-tight text-[#141414] sm:text-lg">
              Sign in with mobile
            </h1>
          </div>
          <Link
            href={nextPath.startsWith("/") ? nextPath : "/"}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#BC7C10] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-md px-5 py-10 sm:px-8 sm:py-12">
        <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#BC7C10]/12 text-[#BC7C10]">
              {step === "phone" ? (
                <Smartphone className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-[#141414]">
                {step === "phone" ? "Enter your details" : "Verify OTP"}
              </h2>
              <p className="mt-1 text-sm text-[#5c5346]">
                {step === "phone"
                  ? "Your name and mobile number — we’ll send an OTP to verify before checkout."
                  : `Hi ${name.trim()}, enter the 6-digit code sent to +91 ${phoneDigits}.`}
              </p>
            </div>
          </div>

          {existing ? (
            <div className="mb-5 rounded-xl border border-[#BC7C10]/20 bg-[#FFF8ED] p-4">
              <p className="text-sm font-bold text-[#141414]">
                Hi, {existing.name}
              </p>
              <p className="mt-0.5 text-xs text-[#5c5346]">
                +91 {existing.phone}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={continueAsLoggedIn}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#BC7C10] px-4 py-2 text-xs font-bold text-white hover:bg-[#9a650d]"
                >
                  Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={switchAccount}
                  className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-[#141414] hover:bg-black/[0.03]"
                >
                  Use another number
                </button>
              </div>
            </div>
          ) : null}

          {step === "phone" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendOtp();
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="name"
                  className="flex items-center gap-2 text-sm font-semibold text-[#141414]"
                >
                  <UserRound className="h-4 w-4 text-[#BC7C10]" />
                  Your name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-2 w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 text-sm text-[#141414] outline-none transition-colors placeholder:text-[#5c5346]/50 focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-[#141414]"
                >
                  Mobile number
                </label>
                <div className="mt-2 flex overflow-hidden rounded-xl border border-black/10 bg-[#FFFCF7] focus-within:border-[#BC7C10] focus-within:ring-2 focus-within:ring-[#BC7C10]/20">
                  <span className="flex items-center border-r border-black/10 px-3 text-sm font-semibold text-[#5c5346]">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={phoneDigits}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="9876543210"
                    className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#141414] outline-none placeholder:text-[#5c5346]/50"
                  />
                </div>
              </div>

              {error ? (
                <p className="text-xs font-medium text-[#E24C4C]">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#BC7C10] py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99] disabled:opacity-70"
              >
                {busy ? "Sending…" : "Send OTP"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyOtp();
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-semibold text-[#141414]"
                >
                  Enter OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6-digit code"
                  className="mt-2 w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 text-center text-lg tracking-[0.35em] text-[#141414] outline-none focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20"
                />
              </div>

              {info ? (
                <p className="rounded-lg bg-[#FFF8ED] px-3 py-2 text-xs font-medium text-[#9a650d]">
                  {info}
                </p>
              ) : null}
              {error ? (
                <p className="text-xs font-medium text-[#E24C4C]">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#BC7C10] py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/25 transition-all hover:bg-[#9a650d] active:scale-[0.99] disabled:opacity-70"
              >
                {busy ? "Verifying…" : "Verify & continue"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setError("");
                    setInfo("");
                  }}
                  className="font-semibold text-[#5c5346] hover:text-[#141414]"
                >
                  Change number
                </button>
                <button
                  type="button"
                  disabled={resendIn > 0 || busy}
                  onClick={sendOtp}
                  className="font-semibold text-[#BC7C10] hover:text-[#9a650d] disabled:opacity-50"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-[#5c5346]">
          By continuing you agree to receive an OTP on WhatsApp / SMS for login
          verification.
        </p>
      </div>
    </section>
  );
}
