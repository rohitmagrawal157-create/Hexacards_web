"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Handshake,
  Rocket,
  GraduationCap,
  Wallet,
  Package,
  Headphones,
} from "lucide-react";

type FormState = {
  name: string;
  phone: string;
  email: string;
  state: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
  state: "",
  message: "",
};

const benefits = [
  {
    title: "Proven Product with Growing Demand",
    Icon: Rocket,
  },
  {
    title: "Low Startup Cost",
    Icon: Wallet,
  },
  {
    title: "High-Profit Margins",
    Icon: Handshake,
  },
  {
    title: "No Inventory Required",
    Icon: Package,
  },
  {
    title: "End-to-End Training & Support",
    Icon: GraduationCap,
  },
  {
    title: "Dedicated Partner Support",
    Icon: Headphones,
  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 text-sm text-[#141414] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15";

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = "Full name is required.";

  const digitsOnly = form.phone.replace(/\D/g, "");
  if (!digitsOnly) {
    errors.phone = "Mobile number is required.";
  } else if (digitsOnly.length !== 10) {
    errors.phone = "Enter a valid 10-digit mobile number.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.state.trim()) errors.state = "State is required.";
  if (!form.message.trim()) errors.message = "Message is required.";

  return errors;
}

export default function FranchiseEnquiry() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("submitting");
    setServerMessage(null);

    try {
      const res = await fetch("/franchise_enqyuiry.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          site_url: "https://hexacards.com/franchise",
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      setStatus("success");
      setServerMessage(
        "Thanks! Your enquiry has been submitted — our team will reach out shortly.",
      );
      setForm(initialForm);
    } catch {
      setStatus("error");
      setServerMessage(
        "Something went wrong submitting your enquiry. Please try again, or email info@hexacards.com.",
      );
    }
  }

  return (
    <section className="bg-[#FFFCF7] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.16em] text-[#BC7C10] uppercase">
            Partner with HexaCards
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141414] sm:text-4xl">
            Franchise Enquiry
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#5c5346] sm:text-base">
            Join India&apos;s growing NFC digital card network. Share a few
            details and we&apos;ll guide you through the partnership process.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:mt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          {/* Form card */}
          <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF8ED] text-[#BC7C10] ring-1 ring-[#BC7C10]/20">
                <Handshake className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#141414]">
                  Send your enquiry
                </h2>
                <p className="mt-1 text-sm text-[#6b6560]">
                  Fields marked with * are required.
                </p>
              </div>
            </div>

            {serverMessage ? (
              <div
                role="status"
                className={`mt-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ${
                  status === "success"
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                    : "bg-red-50 text-red-700 ring-1 ring-red-100"
                }`}
              >
                {status === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : null}
                <span>{serverMessage}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="franchise-name"
                  className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase"
                >
                  Full name *
                </label>
                <input
                  id="franchise-name"
                  name="name"
                  type="text"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  className={`${fieldClass} ${
                    errors.name ? "border-red-400 focus:ring-red-200" : ""
                  }`}
                />
                {errors.name ? (
                  <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="franchise-phone"
                    className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase"
                  >
                    Mobile number *
                  </label>
                  <input
                    id="franchise-phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={form.phone}
                    onChange={(e) =>
                      updateField(
                        "phone",
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    aria-invalid={Boolean(errors.phone)}
                    className={`${fieldClass} ${
                      errors.phone ? "border-red-400 focus:ring-red-200" : ""
                    }`}
                  />
                  {errors.phone ? (
                    <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="franchise-email"
                    className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase"
                  >
                    Email *
                  </label>
                  <input
                    id="franchise-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    className={`${fieldClass} ${
                      errors.email ? "border-red-400 focus:ring-red-200" : ""
                    }`}
                  />
                  {errors.email ? (
                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                  ) : null}
                </div>
              </div>

              <div>
                <label
                  htmlFor="franchise-state"
                  className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase"
                >
                  State *
                </label>
                <input
                  id="franchise-state"
                  name="state"
                  type="text"
                  placeholder="Your state"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  aria-invalid={Boolean(errors.state)}
                  className={`${fieldClass} ${
                    errors.state ? "border-red-400 focus:ring-red-200" : ""
                  }`}
                />
                {errors.state ? (
                  <p className="mt-1 text-xs text-red-600">{errors.state}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="franchise-message"
                  className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase"
                >
                  Message *
                </label>
                <textarea
                  id="franchise-message"
                  name="message"
                  rows={5}
                  placeholder="Tell us about your city, experience, and interest in the franchise…"
                  value={form.message}
                  onChange={(e) => updateField("message", e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  className={`${fieldClass} resize-y ${
                    errors.message ? "border-red-400 focus:ring-red-200" : ""
                  }`}
                />
                {errors.message ? (
                  <p className="mt-1 text-xs text-red-600">{errors.message}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#BC7C10] px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/20 transition hover:bg-[#9a650d] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? "Sending…" : "Send Enquiry"}
              </button>
            </form>
          </div>

          {/* Info panel */}
          <div className="flex flex-col gap-5">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1a17] to-[#0f0e0c] p-6 text-white shadow-[0_16px_40px_rgba(15,14,12,0.18)] sm:p-8">
              <p className="text-xs font-bold tracking-[0.16em] text-[#BC7C10] uppercase">
                Why partner with us
              </p>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight">
                Become a HexaCards Franchise Partner
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#d8d2c6]">
                HexaCards is India&apos;s leading NFC-enabled smart business
                card brand. We help professionals and businesses replace paper
                visiting cards with modern digital networking tools.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#d8d2c6]">
                <span className="font-semibold text-white">Our product:</span>{" "}
                Reusable NFC business cards that share contact details,
                websites, portfolios, social links, and more — instantly.
              </p>
            </div>

            <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:p-7">
              <h3 className="text-sm font-bold tracking-wide text-[#141414] uppercase">
                Partner benefits
              </h3>
              <ul className="mt-4 space-y-3">
                {benefits.map(({ title, Icon }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF8ED] text-[#BC7C10] ring-1 ring-[#BC7C10]/15">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="pt-1.5 text-sm font-medium text-[#3d4657]">
                      {title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
