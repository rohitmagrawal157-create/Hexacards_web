"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  formatSessionMinutes,
  getSuperAdminUser,
  isSuperAdminLoggedIn,
  setSuperAdminUser,
  verifySuperAdminCredentials,
  type SuperAdminUser,
} from "@/lib/super-admin-auth";
import HexNetworkBackground from "@/components/shared/HexNetworkBackground";

function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-login-fade relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F8FA] px-5 py-12 text-[#141414]">
      <HexNetworkBackground idPrefix="adminHex" />
      {children}
    </div>
  );
}

export default function SuperAdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/super-admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<SuperAdminUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const user = getSuperAdminUser();
    if (user) setExisting(user);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setBusy(true);
    try {
      if (!verifySuperAdminCredentials(email, password)) {
        setError("Invalid email or password.");
        return;
      }
      setSuperAdminUser(email, "Super Admin");
      router.replace(nextPath.startsWith("/") ? nextPath : "/super-admin");
    } finally {
      setBusy(false);
    }
  }

  function continueAsLoggedIn() {
    router.replace(nextPath.startsWith("/") ? nextPath : "/super-admin");
  }

  if (isSuperAdminLoggedIn() && existing) {
    return (
      <LoginShell>
        <div className="admin-login-rise relative z-10 w-full max-w-[420px] rounded-2xl border border-black/[0.06] bg-white p-8 shadow-[0_20px_50px_-24px_rgba(20,20,20,0.25)]">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF8ED] ring-1 ring-[#BC7C10]/15">
              <ShieldCheck className="h-5 w-5 text-[#BC7C10]" />
            </span>
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                Super Admin
              </p>
              <h1 className="font-dashboard text-lg font-bold tracking-tight text-[#141414]">
                Already signed in
              </h1>
            </div>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-[#5c5346]">
            Signed in as{" "}
            <span className="font-semibold text-[#141414]">{existing.email}</span>
          </p>
          <button
            type="button"
            onClick={continueAsLoggedIn}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#BC7C10] py-3 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/20 transition-all hover:bg-[#9a650d] hover:shadow-lg hover:shadow-[#BC7C10]/25 active:scale-[0.99]"
          >
            Go to dashboard
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </LoginShell>
    );
  }

  return (
    <LoginShell>
      <div className="relative z-10 w-full max-w-[440px]">
        <div className="admin-login-rise mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="relative h-8 w-[132px] sm:h-9 sm:w-[150px]">
            <Image
              src="/Images/Hexacards.png"
              alt="HexaCards"
              fill
              priority
              className="object-contain object-left"
              sizes="150px"
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#5c5346] backdrop-blur-sm transition-colors hover:border-black/10 hover:text-[#141414]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Website
          </Link>
        </div>

        <div className="admin-login-rise-delay overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_20px_50px_-24px_rgba(20,20,20,0.25)]">
          <div className="border-b border-black/[0.05] bg-gradient-to-r from-[#FFFCF7] via-white to-[#FFF8ED] px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
                <ShieldCheck className="h-5 w-5 text-[#BC7C10]" />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                  Control panel
                </p>
                <h1 className="font-dashboard mt-0.5 text-xl font-bold tracking-tight text-[#141414] sm:text-2xl">
                  Super Admin sign in
                </h1>
                <p className="mt-1 text-sm text-[#8a8174]">
                  Secure access for HexaCards administrators. Session ends after{" "}
                  {formatSessionMinutes()} minutes of inactivity.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6 sm:px-8 sm:py-7">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1.5 block text-xs font-semibold text-[#5c5346]"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8a8174]" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hexacards.com"
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] py-3 pr-4 pl-10 text-sm text-[#141414] placeholder:text-[#8a8174]/55 transition-shadow focus:border-[#BC7C10] focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-[#5c5346]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[11px] font-semibold text-[#BC7C10] hover:text-[#9a650d]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8a8174]" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] py-3 pr-4 pl-10 text-sm text-[#141414] placeholder:text-[#8a8174]/55 transition-shadow focus:border-[#BC7C10] focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-[#E24C4C]/20 bg-[#E24C4C]/5 px-3 py-2.5 text-sm text-[#E24C4C]"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#BC7C10] py-3 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/20 transition-all hover:bg-[#9a650d] hover:shadow-lg hover:shadow-[#BC7C10]/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
              {!busy ? (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </button>
          </form>

          <div className="border-t border-black/[0.05] bg-[#FAFAF8]/80 px-6 py-4 sm:px-8">
            <p className="text-[11px] leading-relaxed text-[#8a8174]">
              <span className="font-semibold text-[#5c5346]">Demo access:</span>{" "}
              {DEMO_ADMIN_EMAIL} / {DEMO_ADMIN_PASSWORD}
            </p>
            <p className="mt-1 text-[11px] text-[#8a8174]/80">
              Internal HexaCards use only. Do not share credentials.
            </p>
          </div>
        </div>
      </div>
    </LoginShell>
  );
}
