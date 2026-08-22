"use client";

import { useState } from "react";
import {
  CheckCircle2,
  MessageSquareText,
  Clock3,
  ShieldCheck,
  Headphones,
} from "lucide-react";

type FormState = {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 text-sm text-[#141414] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15";

const highlights = [
  {
    title: "Fast response",
    text: "We typically reply within one business day.",
    Icon: Clock3,
  },
  {
    title: "Order & design help",
    text: "Support for NFC cards, bulk orders, and custom mockups.",
    Icon: Headphones,
  },
  {
    title: "Trusted support",
    text: "Speak with the HexaCards team Monday–Saturday, 10 AM–6 PM.",
    Icon: ShieldCheck,
  },
];

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

  if (!form.subject.trim()) errors.subject = "Subject is required.";
  if (!form.message.trim()) errors.message = "Message is required.";

  return errors;
}

export default function ContactUsForm() {
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
      const res = await fetch("/contact_enquiry.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          site_url: "https://hexacards.com/contact",
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      setStatus("success");
      setServerMessage(
        "Thanks! Your message has been sent — our team will get back to you soon.",
      );
      setForm(initialForm);
    } catch {
      // Fallback: open email client if PHP endpoint is unavailable locally
      const mailto = `mailto:info@hexacards.com?subject=${encodeURIComponent(
        form.subject || "Contact enquiry",
      )}&body=${encodeURIComponent(
        `Name: ${form.name}\nPhone: ${form.phone}\nEmail: ${form.email}\n\n${form.message}`,
      )}`;
      window.location.href = mailto;
      setStatus("success");
      setServerMessage(
        "Opening your email app to finish sending. You can also reach us on WhatsApp.",
      );
      setForm(initialForm);
    }
  }

  return (
    <section className="border-t border-black/[0.05] bg-[#FFFCF7] py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.16em] text-[#BC7C10] uppercase">
            Get in touch
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#141414] sm:text-3xl">
            Send us a message
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#5c5346]">
            Tell us about your order, custom design, or support need — we will
            respond as soon as we can.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF8ED] text-[#BC7C10] ring-1 ring-[#BC7C10]/20">
                <MessageSquareText className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#141414]">
                  Contact form
                </h3>
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
                  htmlFor="contact-name"
                  className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase"
                >
                  Full name *
                </label>
                <input
                  id="contact-name"
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
                    htmlFor="contact-phone"
                    className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase"
                  >
                    Mobile number *
                  </label>
                  <input
                    id="contact-phone"
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
                    htmlFor="contact-email"
                    className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase"
                  >
                    Email *
                  </label>
                  <input
                    id="contact-email"
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
                  htmlFor="contact-subject"
                  className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase"
                >
                  Subject *
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  placeholder="Order help, bulk enquiry, custom design…"
                  value={form.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                  aria-invalid={Boolean(errors.subject)}
                  className={`${fieldClass} ${
                    errors.subject ? "border-red-400 focus:ring-red-200" : ""
                  }`}
                />
                {errors.subject ? (
                  <p className="mt-1 text-xs text-red-600">{errors.subject}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase"
                >
                  Message *
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  placeholder="How can we help you?"
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

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#BC7C10] px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-[#BC7C10]/20 transition hover:bg-[#9a650d] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "submitting" ? "Sending…" : "Send Message"}
                </button>
                <a
                  href={`https://wa.me/919226286898?text=${encodeURIComponent(
                    "Hi HexaCards, I have a question.",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#25D366]/40 bg-[#F0FFF4] px-5 py-3.5 text-sm font-bold text-[#128C7E] transition hover:bg-[#E6F9ED]"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </form>
          </div>

          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1a17] to-[#0f0e0c] p-6 text-white sm:p-7">
              <p className="text-xs font-bold tracking-[0.16em] text-[#BC7C10] uppercase">
                Support hours
              </p>
              <h3 className="mt-2 text-xl font-extrabold">
                We&apos;re here to help
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#d8d2c6]">
                Monday–Saturday · 10:00 AM–6:00 PM
              </p>
              <a
                href="mailto:info@hexacards.com"
                className="mt-4 inline-block text-sm font-semibold text-[#BC7C10] hover:text-[#d4a04a]"
              >
                info@hexacards.com
              </a>
              <a
                href="tel:+919226286898"
                className="mt-2 block text-sm font-semibold text-white/90 hover:text-white"
              >
                +91 9226286898
              </a>
            </div>

            <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:p-7">
              <h3 className="text-sm font-bold tracking-wide text-[#141414] uppercase">
                Why contact us
              </h3>
              <ul className="mt-4 space-y-4">
                {highlights.map(({ title, text, Icon }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF8ED] text-[#BC7C10] ring-1 ring-[#BC7C10]/15">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#141414]">
                        {title}
                      </p>
                      <p className="mt-0.5 text-sm text-[#5c5346]">{text}</p>
                    </div>
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
