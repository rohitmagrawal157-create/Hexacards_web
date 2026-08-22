import {
  Building2,
  Stethoscope,
  Scale,
  Landmark,
  GraduationCap,
  Sparkles,
  Hotel,
  Factory,
  Briefcase,
  Users,
  ArrowRight,
} from "lucide-react";

// Industries list matched to the actual reference — name + icon + color
// defined together so there's no risk of index drift if this list is
// reordered later.
const industries = [
  { name: "Real Estate", Icon: Building2, bg: "#FFFCF6", fg: "#BC7C10" },
  { name: "Doctors", Icon: Stethoscope, bg: "#FFFCF6", fg: "#BC7C10" },
  { name: "Lawyers", Icon: Scale, bg: "#FFFCF6", fg: "#BC7C10" },
  { name: "CA / Finance", Icon: Landmark, bg: "#FFFCF6", fg: "#BC7C10" },
  { name: "Students", Icon: GraduationCap, bg: "#FFFCF6", fg: "#BC7C10" },
  { name: "Influencers", Icon: Sparkles, bg: "#FFFCF6", fg: "#BC7C10" },
  { name: "Hotels", Icon: Hotel, bg: "#FFFCF6", fg: "#BC7C10" },
  { name: "Manufacturers", Icon: Factory, bg: "#FFFCF6", fg: "#BC7C10" },
  { name: "Consultants", Icon: Briefcase, bg: "#FFFCF6", fg: "#BC7C10" },
  { name: "Corporate Teams", Icon: Users, bg: "#FFFCF6", fg: "#BC7C10" },
];

/** Left-side nest — dashed hexes + nodes (not hero/feature style) */
function IndustriesLeftBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 left-0 z-0 w-full overflow-hidden sm:w-[55%] lg:w-[48%]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_60%_at_18%_42%,#ffffff_0%,transparent_70%)]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.38]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMinYMid slice"
      >
        <defs>
          <pattern
            id="industriesHexTile"
            width="128"
            height="111"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-8 64 55)"
          >
            {/* Flat-top but dashed + larger — distinct from hero solid lines & feature pointy */}
            <path
              d="M64 6 L118 37 L118 79 L64 110 L10 79 L10 37 Z"
              fill="none"
              stroke="#64748b"
              strokeOpacity="0.32"
              strokeWidth="1.15"
              strokeDasharray="5 4"
              strokeLinejoin="round"
            />
            <circle cx="64" cy="6" r="2.2" fill="#BC7C10" fillOpacity="0.22" />
            <circle cx="118" cy="37" r="1.8" fill="#64748b" fillOpacity="0.2" />
            <circle cx="10" cy="37" r="1.8" fill="#64748b" fillOpacity="0.2" />
            <circle cx="64" cy="58" r="1.4" fill="#BC7C10" fillOpacity="0.12" />
          </pattern>

          <linearGradient id="industriesHexFadeR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFCF6" stopOpacity="0" />
            <stop offset="45%" stopColor="#FFFCF6" stopOpacity="0" />
            <stop offset="72%" stopColor="#FFFCF6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFFCF6" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="industriesHexFadeY" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFCF6" stopOpacity="0.95" />
            <stop offset="16%" stopColor="#FFFCF6" stopOpacity="0" />
            <stop offset="84%" stopColor="#FFFCF6" stopOpacity="0" />
            <stop offset="100%" stopColor="#FFFCF6" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#industriesHexTile)" />
        <rect width="100%" height="100%" fill="url(#industriesHexFadeR)" />
        <rect width="100%" height="100%" fill="url(#industriesHexFadeY)" />
      </svg>
    </div>
  );
}

export default function Industries() {
  return (
    <section
      id="industries"
      className="relative scroll-mt-20 overflow-hidden bg-[#FFFCF6] py-20 sm:py-24"
    >
      <IndustriesLeftBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-[#BC7C10]/20 bg-white/80 px-4 py-1.5 text-sm font-semibold text-[#BC7C10] backdrop-blur-sm">
            Trusted Across Industries
          </span>

          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-[#0f172a] sm:text-5xl">
            Perfect for Every Industry
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-[#5b6472]">
            From clinics to construction sites, teams across every sector use
            Hexa Cards to make a lasting first impression.
          </p>
        </div>

        <ul className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {industries.map(({ name, Icon, bg, fg }) => (
            <li
              key={name}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/90 px-4 py-6 text-center backdrop-blur-[2px] transition-all duration-200 hover:-translate-y-1 hover:border-[#BC7C10]/20 hover:shadow-lg hover:shadow-[#BC7C10]/[0.08]"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: bg, color: fg }}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-semibold text-[#1a1a1a]">
                {name}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <a
            href="#"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#BC7C10] transition-colors hover:text-[#9a650d]"
          >
            <span>View All Industries</span>
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              strokeWidth={2.25}
            />
          </a>
        </div>
      </div>
    </section>
  );
}
