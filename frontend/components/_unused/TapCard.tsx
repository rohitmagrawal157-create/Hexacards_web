"use client";

import type { UserCard } from "./types";

type TapCardProps = {
  user: UserCard;
  flipped: boolean;
  index: number;
  onToggle: (id: string) => void;
};

const accentStyles: Record<
  UserCard["accent"],
  { avatar: string; glow: string; chip: string }
> = {
  jade: {
    avatar: "from-[#1f6f5b] to-[#0d3d32]",
    glow: "shadow-[0_0_0_1px_rgba(45,180,140,0.25)]",
    chip: "bg-[#1f6f5b]/15 text-[#7ddec0]",
  },
  amber: {
    avatar: "from-[#b87a28] to-[#6b3e12]",
    glow: "shadow-[0_0_0_1px_rgba(232,168,72,0.25)]",
    chip: "bg-[#b87a28]/15 text-[#f0c27a]",
  },
  sky: {
    avatar: "from-[#2a6f9e] to-[#163a55]",
    glow: "shadow-[0_0_0_1px_rgba(90,170,220,0.25)]",
    chip: "bg-[#2a6f9e]/15 text-[#8ec8eb]",
  },
  rose: {
    avatar: "from-[#a34d5f] to-[#5c2432]",
    glow: "shadow-[0_0_0_1px_rgba(220,120,140,0.25)]",
    chip: "bg-[#a34d5f]/15 text-[#e8a0ae]",
  },
  violet: {
    avatar: "from-[#6b5a9e] to-[#34285a]",
    glow: "shadow-[0_0_0_1px_rgba(160,140,210,0.25)]",
    chip: "bg-[#6b5a9e]/15 text-[#c4b4e8]",
  },
};

const statusLabel: Record<UserCard["status"], string> = {
  available: "Available",
  busy: "In a meeting",
  away: "Away",
};

const statusDot: Record<UserCard["status"], string> = {
  available: "bg-[#4ade80]",
  busy: "bg-[#f87171]",
  away: "bg-[#fbbf24]",
};

export default function TapCard({
  user,
  flipped,
  index,
  onToggle,
}: TapCardProps) {
  const accent = accentStyles[user.accent];

  return (
    <article
      className="tap-card-enter group relative h-[280px] w-full [perspective:1200px]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        className={`tap-card-inner relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        } ${accent.glow}`}
      >
        {/* Front */}
        <div className="tap-card-face absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(160deg,#151c1a_0%,#0f1412_100%)] p-5 [backface-visibility:hidden]">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(125,222,192,0.12),transparent_70%)]"
            aria-hidden
          />

          <div className="flex items-start justify-between gap-3">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-semibold tracking-wide text-white ${accent.avatar}`}
              aria-hidden
            >
              {user.initials}
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium tracking-wide ${accent.chip}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${statusDot[user.status]}`}
                aria-hidden
              />
              {statusLabel[user.status]}
            </span>
          </div>

          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-[#f2f7f4]">
              {user.name}
            </h3>
            <p className="mt-1 text-sm text-[#9bb0a6]">{user.role}</p>
            <p className="mt-0.5 text-xs tracking-wide text-[#6d8278] uppercase">
              {user.department}
            </p>
          </div>

          <p className="text-[11px] tracking-[0.14em] text-[#5f746a] uppercase">
            Tap for details
          </p>
        </div>

        {/* Back */}
        <div className="tap-card-face absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,#1a2420_0%,#101614_100%)] p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div>
            <p className="text-[11px] tracking-[0.16em] text-[#7ddec0] uppercase">
              Contact
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-[#f2f7f4]">
              {user.name}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#b4c7bd]">
              {user.bio}
            </p>
          </div>

          <dl className="space-y-2.5 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] tracking-wide text-[#6d8278] uppercase">
                Email
              </dt>
              <dd className="truncate text-[#e6f0ea]">{user.email}</dd>
            </div>
            <div className="flex gap-6">
              <div className="min-w-0 flex-1">
                <dt className="text-[11px] tracking-wide text-[#6d8278] uppercase">
                  Phone
                </dt>
                <dd className="text-[#e6f0ea]">{user.phone}</dd>
              </div>
              <div className="min-w-0 flex-1">
                <dt className="text-[11px] tracking-wide text-[#6d8278] uppercase">
                  Location
                </dt>
                <dd className="text-[#e6f0ea]">{user.location}</dd>
              </div>
            </div>
          </dl>

          <p className="text-[11px] tracking-[0.14em] text-[#5f746a] uppercase">
            Tap to close
          </p>
        </div>
      </div>

      {/* Empty hit target — keeps block content out of <button> (valid HTML) */}
      <button
        type="button"
        aria-expanded={flipped}
        aria-label={`${user.name}, ${user.role}. Tap to ${flipped ? "hide" : "show"} details`}
        onClick={() => onToggle(user.id)}
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl border-0 bg-transparent outline-none transition-transform duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#7ddec0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1110] active:scale-[0.985]"
      />
    </article>
  );
}
