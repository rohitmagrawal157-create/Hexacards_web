import {
  Volume2,
  Settings,
  RotateCcw,
  Wifi,
  Share2,
  History,
  Maximize2,
} from "lucide-react";

const bullets = [
  "Never reorder cards again — update instantly",
  "Instantly capture contact details — no typing required",
  "See who views your profile and when",
  "Choose from premium materials: Metal, PVC, Wood, Eco-Friendly",
  "Follow up automatically, without lifting a finger",
];

export default function WhyHexaCards() {
  return (
    <section id="why-hexa" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2 className="text-center text-4xl font-extrabold tracking-tight text-[#0f172a] sm:text-5xl">
          Why Hexa Cards?
        </h2>

        <div className="mt-16 grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
          {/* ── Left: mocked video player ─────────────────── */}
          <div className="rounded-3xl bg-gradient-to-br from-[#f0dfb4] to-[#fbeed7] p-1 shadow-lg shadow-black/5">
            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-b from-[#3a3a3a] via-[#8a8a8a] to-white">
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 pt-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-2 ring-[#BC7C10]">
                    <span className="h-3.5 w-3.5 rounded-full bg-[#BC7C10]" />
                  </span>
                  <div>
                    <p className="text-base font-bold leading-tight text-white">
                      Digital Business Card - Hexa Cards
                    </p>
                    <p className="text-xs text-white/70">Hexa Cards</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <Volume2 className="h-5 w-5" strokeWidth={1.75} />
                  <span className="flex h-7 items-center justify-center rounded border border-white/60 px-1.5 text-[10px] font-bold">
                    CC
                  </span>
                  <Settings className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </div>

              {/* Card graphic — represents the paper→digital swap */}
              <div className="flex items-center justify-center gap-3 py-16">
                <div className="flex items-center gap-1.5 text-2xl font-extrabold text-white sm:text-3xl">
                  <span>Hexa Cards</span>
                  <Wifi className="h-4 w-4 rotate-90" strokeWidth={2.5} />
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white">
                  <RotateCcw className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="flex items-center gap-1.5 text-2xl font-extrabold text-[#0f172a] sm:text-3xl">
                  <span>Hexa Cards</span>
                  <Wifi className="h-4 w-4 rotate-90" strokeWidth={2.5} />
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative px-5">
                <div className="h-[3px] w-full rounded-full bg-black/10">
                  <div className="h-[3px] w-full rounded-full bg-[#BC7C10]" />
                </div>
                <span className="absolute right-5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#BC7C10]" />
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-5 py-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-[#1a1a1a]">
                    <Share2 className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-[#1a1a1a]">
                    <History className="h-4 w-4" strokeWidth={2} />
                  </span>
                </div>
                <span className="rounded bg-black/40 px-2 py-1 text-xs font-semibold text-white">
                  0:54 / 0:54
                </span>
              </div>

              <button
                type="button"
                aria-label="Expand video"
                className="absolute bottom-16 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/45"
              >
                <Maximize2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* ── Right: copy ────────────────────────────────── */}
          <div>
            <span className="inline-flex items-center rounded-full bg-[#FFFCF6] px-4 py-1.5 text-sm font-semibold text-[#BC7C10]">
              The premium business card everyone is talking about
            </span>

            <h3 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-[#0f0f12] sm:text-4xl">
              Paper cards get lost.
              <br />
              Hexa Cards gets remembered.
            </h3>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#3d4657]">
              <strong className="font-bold text-[#0f0f12]">88%</strong> of
              paper business cards are thrown away within 24 hours. Hexa
              Cards gives you a premium way to share your details, stay top
              of mind, and turn conversations into real connections.
            </p>

            <ul className="mt-8 space-y-4">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f0f12]" />
                  <span className="text-base leading-relaxed text-[#3d4657]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}