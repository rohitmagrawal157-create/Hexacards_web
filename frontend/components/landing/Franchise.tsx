import Image from "next/image";
import { Rocket, GraduationCap, Megaphone, MapPin } from "lucide-react";

export default function Franchise() {
  return (
    <section
      id="franchise"
      className="scroll-mt-20 bg-white py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1c1a17] to-[#0f0e0c] p-8 shadow-[0_20px_50px_rgba(15,14,12,0.18)] sm:p-10">
          {/* Subtle gold glow so the dark panel doesn't feel flat */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -top-1/2 right-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_center,rgba(188,124,16,0.15),transparent_70%)] blur-2xl" />
          </div>

          <div className="relative grid items-center gap-8 lg:grid-cols-[auto_1fr_auto] lg:gap-10">
            <div className="relative mx-auto hidden h-40 w-56 shrink-0 overflow-hidden rounded-2xl border border-[#BC7C10]/25 bg-[#141210] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] lg:block">
              <Image
                src="/Images/franchise-storefront.png"
                alt="HexaCards franchise storefront shop"
                fill
                className="object-cover object-center"
                sizes="224px"
                priority={false}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f0e0c]/50 via-transparent to-transparent"
              />
            </div>

            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-[#BC7C10] uppercase">
                Join Our Growing Family
              </p>
              <h3 className="mt-2 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                Become a Franchise Partner
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#d8d2c6]">
                Low investment. High returns. Be a part of India&apos;s fastest
                growing digital networking brand.
              </p>

              <a
                href="/franchise"
                className="mt-6 inline-flex rounded-lg bg-[#BC7C10] px-6 py-3 text-sm font-bold text-white shadow-md shadow-black/30 transition-transform hover:bg-[#9a650d] active:scale-[0.98]"
              >
                Apply Now
              </a>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-2 lg:gap-5">
              {[
                { label: "Low Investment High Returns", Icon: Rocket },
                { label: "Complete Training & Support", Icon: GraduationCap },
                { label: "Marketing Support", Icon: Megaphone },
                { label: "Pan India Opportunity", Icon: MapPin },
              ].map(({ label, Icon }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#BC7C10]/30 text-[#BC7C10]">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-white/80">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
