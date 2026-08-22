import Image from "next/image";
import { Star, Check, ArrowRight } from "lucide-react";
import { testimonials } from "./data";

const enterpriseFeatures = [
  "Centralized Dashboard",
  "Custom Branding",
  "Bulk Ordering & Management",
  "Lead Management",
  "Team Analytics & Reports",
  "Dedicated Account Manager",
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-20 bg-white py-16 sm:py-20">
      {/* Enterprise solution panel */}
      <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="overflow-hidden rounded-3xl bg-[#1a1a1a] shadow-[0_16px_48px_rgba(15,23,42,0.18)] lg:flex">
          {/* Left: copy */}
          <div className="relative z-10 flex flex-col justify-center p-8 sm:p-10 lg:w-[40%] lg:shrink-0">
            <p className="text-xs font-bold tracking-[0.2em] text-[#BC7C10] uppercase">
              Enterprise Solution
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Powerful Networking
              <br />
              For Your Entire Team
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              Manage, track and grow your team&apos;s networking from one
              powerful dashboard.
            </p>

            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {enterpriseFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-white/85"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#BC7C10]/15 text-[#BC7C10]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <a
              href="/contact"
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-xl bg-[#BC7C10] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#9a650d]"
            >
              Book Enterprise Demo
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </a>
          </div>

          {/* Right: dashboard image — full-bleed, no edge gap */}
          <div className="relative isolate min-h-[300px] overflow-hidden bg-white sm:min-h-[360px] lg:min-h-full lg:w-[60%]">
            <Image
              src={`/Images/Dashboard.png?v=2026-08-11-1633`}
              alt="HexaCards dashboard overview"
              fill
              unoptimized
              className="object-cover object-left-top"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority={false}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2 className="text-center text-sm font-bold tracking-[0.15em] text-[#1a1a1a] uppercase">
          Loved by Thousands
        </h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((item) => (
            <li
              key={item.name}
              className="relative rounded-2xl border border-black/[0.06] bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#BC7C10] text-sm font-bold text-white">
                  {item.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <p className="text-sm font-bold text-[#1a1a1a]">{item.name}</p>
                  <p className="text-xs text-[#a0a0a8]">{item.role}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: item.rating ?? 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5 fill-[#BC7C10] text-[#BC7C10]"
                  />
                ))}
              </div>

              <p className="mt-3 text-sm leading-relaxed text-[#4a4a52]">
                {item.quote}
              </p>

              <span className="absolute bottom-4 right-4 text-lg font-bold">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 text-center">
          <a
            href="#testimonials"
            className="text-sm font-semibold text-[#BC7C10] hover:text-[#9a650d]"
          >
            View All Reviews →
          </a>
        </div>
      </div>
    </section>
  );
}
