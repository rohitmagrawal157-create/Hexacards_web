import Link from "next/link";
import { ExternalLink, MapPin, Mail, Phone } from "lucide-react";
import { Navbar, Footer, FAQ, ContactUsForm } from "@/components/landing";

const officeAddress =
  "Hexa Cards - Digital Business Cards, Plot No 42, G Sector, opposite Medicover Hospital, Town Center, Cidco, Chhatrapati Sambhajinagar, Maharashtra 431003";
const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(officeAddress)}`;

export const metadata = {
  title: "Contact Us — HexaCards",
  description: "Get in touch with Hexa Cards for orders, support, and bulk enquiries.",
};

export default function ContactPage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <div className="border-b border-black/[0.06] bg-white/80">
          <div className="mx-auto max-w-6xl px-5 py-8 text-center sm:px-8 sm:py-10">
            <p className="text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
              Contact
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141414] sm:text-4xl">
              Contact Us
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#5c5346] sm:text-base">
              Questions about your card, bulk orders, or custom designs — we are
              here to help.
            </p>
          </div>
        </div>

        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFFCF7] text-[#BC7C10] ring-1 ring-black/[0.04]">
                <MapPin className="h-5 w-5" strokeWidth={2} />
              </span>
              <p className="mt-4 text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                Address
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5346]">
                Hexa Cards — Digital Business Cards
                <br />
                Plot No 42, &apos;G&apos; Sector, opposite Medicover Hospital,
                Town Center, Cidco, Chhatrapati Sambhajinagar, Maharashtra
                431003
              </p>
              <a
                href={directionsHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#BC7C10] transition-colors hover:text-[#9a650d]"
              >
                Get directions
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFFCF7] text-[#BC7C10] ring-1 ring-black/[0.04]">
                <Mail className="h-5 w-5" strokeWidth={2} />
              </span>
              <p className="mt-4 text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                Email
              </p>
              <a
                href="mailto:info@hexacards.com"
                className="mt-2 block text-sm font-semibold text-[#141414] transition-colors hover:text-[#BC7C10]"
              >
                info@hexacards.com
              </a>
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFFCF7] text-[#BC7C10] ring-1 ring-black/[0.04]">
                <Phone className="h-5 w-5" strokeWidth={2} />
              </span>
              <p className="mt-4 text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                Call / WhatsApp
              </p>
              <a
                href="tel:+919226286898"
                className="mt-2 block text-sm font-semibold text-[#141414] transition-colors hover:text-[#BC7C10]"
              >
                +91 9226286898
              </a>
              <a
                href="https://api.whatsapp.com/send?phone=9226286898"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-bold text-[#25D366] underline decoration-[#25D366]/40 underline-offset-2"
              >
                Open WhatsApp
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/product/nfc-business-card"
              className="inline-flex rounded-full bg-[#BC7C10] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#9a650d]"
            >
              View NFC Card
            </Link>
            <Link
              href="/design-your-card"
              className="inline-flex rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#141414] transition-colors hover:border-[#BC7C10]/35 hover:text-[#BC7C10]"
            >
              Design Your Card
            </Link>
          </div>
        </section>

        <ContactUsForm />

        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
