import { Users, LayoutDashboard } from "lucide-react";

type TeamDashboardCardProps = {
  company?: string;
  status?: string;
  members?: string;
  taps?: string;
  leads?: string;
  cards?: string;
  href?: string;
};

/**
 * Uiverse-style 3D tilt card — adapted for Hexa Teams (not weather).
 * From Uiverse.io by Javierrocadev (layout/motion pattern).
 */
export default function TeamDashboardCard({
  company = "Hexa Teams",
  status = "Live dashboard",
  members = "128",
  taps = "4.2k",
  leads = "386",
  cards = "96",
  href = "#teams",
}: TeamDashboardCardProps) {
  return (
    <a
      href={href}
      aria-label={`${company} team dashboard`}
      className="group relative block w-full max-w-[300px] overflow-hidden rounded-lg border border-neutral-600 bg-gradient-to-bl from-teal-400 via-teal-500 to-teal-700 p-6 backdrop-blur-md duration-500 [box-shadow:12px_12px_0px_0px_#0d0d0d] [transform:rotate3d(1,-1,1,15deg)] hover:shadow-lg hover:[transform:rotate3d(0,0,0,0deg)]"
    >
      <div className="relative flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{company}</h2>
          <p className="mt-0.5 text-sm font-medium text-teal-950/80">{status}</p>
        </div>
        <LayoutDashboard
          className="absolute -top-1 -right-1 h-11 w-11 text-teal-100/90"
          strokeWidth={1.5}
          aria-hidden
        />
      </div>

      <div className="mt-5">
        <p className="flex items-baseline gap-2 text-4xl font-bold text-white">
          {members}
          <span className="text-base font-semibold text-teal-100/90">
            members
          </span>
        </p>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-teal-950/75">Taps this month</span>
            <span className="text-sm font-semibold text-white">{taps}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-teal-950/75">Leads captured</span>
            <span className="text-sm font-semibold text-white">{leads}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-teal-950/75">Active cards</span>
            <span className="text-sm font-semibold text-white">{cards}</span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-white/20 pt-4 text-xs font-semibold tracking-wide text-white/90 uppercase">
          <Users className="h-3.5 w-3.5" aria-hidden />
          One tap for the whole team
        </div>
      </div>
    </a>
  );
}
