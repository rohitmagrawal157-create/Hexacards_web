"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, X } from "lucide-react";
import { saveCardMessage } from "@/lib/card-messages";
import {
  getInvisibleRecaptchaToken,
  isRecaptchaConfigured,
  ensureInvisibleRecaptcha,
  verifyRecaptchaOnServer,
} from "@/lib/recaptcha";
import { resolveCardAccent } from "@/lib/card-profile";

type CardContactFormProps = {
  accentColor: string;
  className?: string;
};

export default function CardContactForm({
  accentColor,
  className = "",
}: CardContactFormProps) {
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const captchaEnabled = isRecaptchaConfigured();
  const accentTheme = resolveCardAccent(accentColor);
  const accent = accentTheme.solid;
  const accentSoft = accentTheme.soft;
  const accentMuted = accentTheme.muted;

  useEffect(() => {
    if (!captchaEnabled) return;
    let cancelled = false;

    const boot = async () => {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const el = recaptchaRef.current;
      if (!el || cancelled) return;
      try {
        await ensureInvisibleRecaptcha(el);
      } catch {
        // Submit path will retry / show a clear error
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [captchaEnabled]);

  async function handleContactSubmit(e: FormEvent) {
    e.preventDefault();
    setContactError("");
    if (
      !contactForm.name.trim() ||
      !contactForm.email.trim() ||
      !contactForm.message.trim()
    ) {
      setContactError("Please fill name, email, and message.");
      return;
    }
    if (contactForm.phone && contactForm.phone.length !== 10) {
      setContactError("Phone number must be 10 digits.");
      return;
    }
    if (contactSubmitting) return;
    setContactSubmitting(true);

    try {
      if (captchaEnabled) {
        const el = recaptchaRef.current;
        if (!el) {
          setContactError("Security check is unavailable. Refresh and retry.");
          return;
        }
        const token = await getInvisibleRecaptchaToken(el);
        const verified = await verifyRecaptchaOnServer(token);
        if (!verified.ok) {
          setContactError(verified.error || "Security check failed.");
          return;
        }
      }

      saveCardMessage({ ...contactForm, website: "" });
      setContactForm({ name: "", email: "", phone: "", message: "" });
      setContactSent(true);
    } catch (err) {
      setContactError(
        err instanceof Error
          ? err.message
          : "Could not send message. Please try again.",
      );
    } finally {
      setContactSubmitting(false);
    }
  }

  return (
    <>
      <div
        className={`overflow-hidden rounded-2xl border bg-white shadow-[0_8px_28px_rgba(0,0,0,0.06)] ${className}`}
        style={{ borderColor: accentMuted }}
      >
        {/* Theme header bar — accent brown + white text */}
        <div
          className="px-4 py-3.5 text-center"
          style={{ backgroundColor: accent }}
        >
          <h3 className="text-base font-extrabold tracking-wide text-white uppercase">
            Leave a Message
          </h3>
          <p className="mt-0.5 text-xs font-medium text-white/85">
            We will get back to you soon
          </p>
        </div>

        <form className="relative space-y-3 p-5" onSubmit={handleContactSubmit}>
          <input
            className="w-full rounded-xl border bg-[#F5F5F5] px-4 py-3 text-sm text-[#141414] outline-none transition placeholder:text-[#9a9a9a] focus:bg-white"
            style={{ borderColor: accentSoft }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${accentSoft}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = accentSoft;
              e.currentTarget.style.boxShadow = "none";
            }}
            placeholder="Your Name"
            value={contactForm.name}
            onChange={(e) =>
              setContactForm((f) => ({ ...f, name: e.target.value }))
            }
            autoComplete="name"
          />
          <input
            type="email"
            className="w-full rounded-xl border bg-[#F5F5F5] px-4 py-3 text-sm text-[#141414] outline-none transition placeholder:text-[#9a9a9a] focus:bg-white"
            style={{ borderColor: accentSoft }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${accentSoft}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = accentSoft;
              e.currentTarget.style.boxShadow = "none";
            }}
            placeholder="Email Address"
            value={contactForm.email}
            onChange={(e) =>
              setContactForm((f) => ({ ...f, email: e.target.value }))
            }
            autoComplete="email"
          />
          <input
            className="w-full rounded-xl border bg-[#F5F5F5] px-4 py-3 text-sm text-[#141414] outline-none transition placeholder:text-[#9a9a9a] focus:bg-white"
            style={{ borderColor: accentSoft }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${accentSoft}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = accentSoft;
              e.currentTarget.style.boxShadow = "none";
            }}
            placeholder="Phone Number (10 digits)"
            value={contactForm.phone}
            onChange={(e) =>
              setContactForm((f) => ({
                ...f,
                phone: e.target.value.replace(/\D/g, "").slice(0, 10),
              }))
            }
            autoComplete="tel"
            inputMode="numeric"
            maxLength={10}
          />
          <textarea
            rows={4}
            className="w-full resize-none rounded-xl border bg-[#F5F5F5] px-4 py-3 text-sm text-[#141414] outline-none transition placeholder:text-[#9a9a9a] focus:bg-white"
            style={{ borderColor: accentSoft }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${accentSoft}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = accentSoft;
              e.currentTarget.style.boxShadow = "none";
            }}
            placeholder="Message or Inquiry"
            value={contactForm.message}
            onChange={(e) =>
              setContactForm((f) => ({ ...f, message: e.target.value }))
            }
          />
          {contactError ? (
            <p className="text-left text-xs font-medium text-[#E24C4C]">
              {contactError}
            </p>
          ) : null}
          <div
            ref={recaptchaRef}
            className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
            aria-hidden
          />
          <button
            type="submit"
            disabled={contactSubmitting}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {contactSubmitting ? "Verifying…" : "Send Message"}
          </button>
          {captchaEnabled ? (
            <p className="text-[10px] leading-relaxed text-[#9a9a9a]">
              Protected by Invisible reCAPTCHA.{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-[#6b6560]"
              >
                Privacy
              </a>{" "}
              ·{" "}
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-[#6b6560]"
              >
                Terms
              </a>
            </p>
          ) : null}
        </form>
      </div>

      {contactSent ? (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-success-title"
          onClick={() => setContactSent(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setContactSent(false)}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-[#8a8174] hover:bg-[#FAFAF8]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <span
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: accentSoft, color: accent }}
            >
              <CheckCircle2 className="h-8 w-8" strokeWidth={1.75} />
            </span>
            <h4
              id="contact-success-title"
              className="mt-4 text-lg font-extrabold tracking-tight text-[#141414]"
            >
              Message sent
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[#6b6560]">
              Thanks for reaching out. Your message has been delivered — the
              card owner can view it in their dashboard.
            </p>
            <button
              type="button"
              onClick={() => setContactSent(false)}
              className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
