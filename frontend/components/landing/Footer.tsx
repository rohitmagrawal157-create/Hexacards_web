import Link from "next/link";
import Image from "next/image";
import { Clock3, MapPin, Mail, Phone } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "NFC Card", href: "/product/nfc-business-card" },
  { label: "Franchise", href: "/franchise" },
  { label: "Services", href: "/services" },
  { label: "Reviews", href: "/product/social-media-cards" },
  { label: "Contact Us", href: "/contact" },
];

type IconProps = { className?: string };

function FacebookIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.174 2.09 16.04 2 14.84 2 12.22 2 10.5 3.66 10.5 6.7V9.5H8v4h2.5V22h3.5v-8.5z" />
    </svg>
  );
}

function LinkedinIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.94 6.5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0zM3.5 8.75h3v11.5h-3V8.75zM9.25 8.75h2.87v1.57h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6v6.89h-3v-6.11c0-1.46-.03-3.33-2.03-3.33-2.03 0-2.34 1.59-2.34 3.23v6.21h-3V8.75z" />
    </svg>
  );
}

function InstagramIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2zM17.5 6.95a1.12 1.12 0 1 1-2.24 0 1.12 1.12 0 0 1 2.24 0z" />
      <path d="M12 3.5c-2.4 0-2.7.01-3.65.05a5.57 5.57 0 0 0-3.8 3.8C4.51 8.3 4.5 8.6 4.5 12s.01 3.7.05 4.65a5.57 5.57 0 0 0 3.8 3.8c.95.04 1.25.05 3.65.05s2.7-.01 3.65-.05a5.57 5.57 0 0 0 3.8-3.8c.04-.95.05-1.25.05-3.65s-.01-3.7-.05-4.65a5.57 5.57 0 0 0-3.8-3.8C14.7 3.51 14.4 3.5 12 3.5zm0 1.7c2.36 0 2.64.01 3.57.05 1.9.09 2.79.99 2.88 2.88.04.93.05 1.21.05 3.57s-.01 2.64-.05 3.57c-.09 1.9-.98 2.79-2.88 2.88-.93.04-1.21.05-3.57.05s-2.64-.01-3.57-.05c-1.9-.09-2.79-.98-2.88-2.88-.04-.93-.05-1.21-.05-3.57s.01-2.64.05-3.57c.09-1.89.98-2.79 2.88-2.88.93-.04 1.21-.05 3.57-.05z" />
    </svg>
  );
}

function XIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.66 3H20.5l-6.54 7.48L21.5 21h-5.9l-4.62-6.04L5.7 21H2.85l7-8.01L2.5 3h6.05l4.17 5.52L17.66 3zm-1.04 16.2h1.63L7.45 4.7H5.7l10.92 14.5z" />
    </svg>
  );
}

function YoutubeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 7.2a3.02 3.02 0 0 0-2.12-2.14C19.5 4.6 12 4.6 12 4.6s-7.5 0-9.38.46A3.02 3.02 0 0 0 .5 7.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 4.8 3.02 3.02 0 0 0 2.12 2.14C4.5 19.4 12 19.4 12 19.4s7.5 0 9.38-.46a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-4.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  );
}

const socials = [
  { Icon: FacebookIcon, href: "#", label: "Facebook" },
  { Icon: LinkedinIcon, href: "#", label: "LinkedIn" },
  { Icon: InstagramIcon, href: "#", label: "Instagram" },
  { Icon: XIcon, href: "#", label: "X" },
  { Icon: YoutubeIcon, href: "#", label: "YouTube" },
];

export default function Footer() {
  const officeAddress =
    "Hexa Cards - Digital Business Cards, Plot No 42, G Sector, opposite Medicover Hospital, Town Center, Cidco, Chhatrapati Sambhajinagar, Maharashtra 431003";
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(officeAddress)}`;

  return (
    <footer id="footer" className="bg-[#171412] pt-16 pb-8 sm:pt-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FBF3E4] text-[#171412]">
              <MapPin className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-[#BC7C10] uppercase">
                Address
              </p>
              <a
                href={directionsHref}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-lg text-white transition-colors hover:text-[#F2C16F]"
                aria-label="Get directions to Hexa Cards on Google Maps"
              >
                Hexa Cards - Digital Business Cards
                <br />
                Plot No 42, &apos;G&apos; Sector, opposite Medicover Hospital, Town Center, Cidco, Chhatrapati Sambhajinagar,
                <br />
                Maharashtra 431003
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FBF3E4] text-[#171412]">
              <Mail className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.15em] text-[#BC7C10] uppercase">
                Support
              </p>
              <a
                href="mailto:info@hexacards.com"
                className="mt-1 block break-all text-lg font-medium text-white transition-colors hover:text-[#F2C16F]"
              >
                info@hexacards.com
              </a>
              <div className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3">
                <Clock3
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#BC7C10]"
                  strokeWidth={2}
                  aria-hidden
                />
                <div>
                  <p className="text-xs font-semibold tracking-wide text-white/45 uppercase">
                    Business hours
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/80">
                    Monday–Saturday
                    <br />
                    10:00 AM–6:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FBF3E4] text-[#171412]">
              <Phone className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-[#BC7C10] uppercase">
                Call
              </p>
              <p className="mt-1 text-lg text-white">
              +91 9226286898
                <br />
                +91 91234 56789
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
          <div className="grid grid-cols-1 items-center gap-8 p-8 sm:p-10 lg:grid-cols-[auto_1fr]">
            <Link
              href="/"
              className="relative block h-16 w-[240px] shrink-0 sm:h-[72px] sm:w-[280px]"
              aria-label="HexaCards home"
            >
              <Image
                src="/Images/whiteLogo.png"
                alt="HexaCards"
                fill
                quality={100}
                sizes="(max-width: 640px) 240px, 280px"
                className="object-contain object-left"
              />
            </Link>

            <p className="text-lg leading-relaxed text-white/60 sm:text-xl">
              &ldquo;Hexa Cards completely changed the way I network — my
              digital profile updates instantly, and I never run out of cards
              to hand out. It&apos;s made every introduction feel more
              professional and memorable.&rdquo;
            </p>
          </div>

          <div className="flex flex-col gap-6 border-t border-white/10 bg-white/[0.02] px-8 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <nav aria-label="Footer">
              <ul className="flex flex-wrap gap-x-8 gap-y-3">
                {navLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-semibold text-white transition-colors hover:text-[#BC7C10]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-3">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#171412] transition-transform hover:scale-105"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-white/50">
            Copyright © 2026 Hexa Cards. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
