type TiltProfileCardProps = {
  initials?: string;
  role?: string;
  ctaLabel?: string;
  href?: string;
  className?: string;
};

export default function TiltProfileCard({
  initials = "HC",
  role = "Digital Business Card",
  ctaLabel = "Get Card",
  href = "#products",
  className = "",
}: TiltProfileCardProps) {
  return (
    <div
      className={`group relative flex h-96 w-64 flex-col items-start gap-4 overflow-hidden rounded-2xl border-4 border-sky-900 bg-sky-800 p-5 duration-500 [transform:rotate3d(1,-1,1,60deg)] hover:[transform:rotate3d(0,0,0,0deg)] ${className}`}
    >
      <div className="relative z-20 text-gray-50">
        <span className="text-5xl font-bold tracking-tight">{initials}</span>
        <p className="mt-1 text-xs text-sky-100/90">{role}</p>
      </div>

      <a
        href={href}
        className="relative z-20 flex flex-row items-center gap-3 border border-sky-900 bg-gray-50 px-3 py-2 text-sm font-semibold text-sky-800 duration-300 hover:bg-sky-900 hover:text-gray-50"
      >
        {ctaLabel}
        <svg
          className="h-5 w-5 fill-current"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M22.1,77.9a4,4,0,0,1,4-4H73.9a4,4,0,0,1,0,8H26.1A4,4,0,0,1,22.1,77.9ZM35.2,47.2a4,4,0,0,1,5.7,0L46,52.3V22.1a4,4,0,1,1,8,0V52.3l5.1-5.1a4,4,0,0,1,5.7,0,4,4,0,0,1,0,5.6l-12,12a3.9,3.9,0,0,1-5.6,0l-12-12A4,4,0,0,1,35.2,47.2Z"
            fillRule="evenodd"
          />
        </svg>
      </a>

      <svg
        className="absolute -right-20 -bottom-0.5 z-10 -my-2 h-48 w-48 fill-gray-50 stroke-sky-900 duration-500 group-hover:scale-125"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        aria-hidden
      >
        <path
          d="M 50.4 51 C 40.5 49.1 40 46 40 44 v -1.2 a 18.9 18.9 0 0 0 5.7 -8.8 h 0.1 c 3 0 3.8 -6.3 3.8 -7.3 s 0.1 -4.7 -3 -4.7 C 53 4 30 0 22.3 6 c -5.4 0 -5.9 8 -3.9 16 c -3.1 0 -3 3.8 -3 4.7 s 0.7 7.3 3.8 7.3 c 1 3.6 2.3 6.9 4.7 9 v 1.2 c 0 2 0.5 5 -9.5 6.8 S 2 62 2 62 h 60 a 14.6 14.6 0 0 0 -11.6 -11 z"
          strokeMiterlimit={10}
          strokeWidth={5}
        />
      </svg>

      <svg
        className="absolute -right-20 -bottom-0.5 z-10 -my-2 h-48 w-48 fill-gray-50 stroke-sky-700 duration-200 group-hover:scale-125"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        aria-hidden
      >
        <path
          d="M 50.4 51 C 40.5 49.1 40 46 40 44 v -1.2 a 18.9 18.9 0 0 0 5.7 -8.8 h 0.1 c 3 0 3.8 -6.3 3.8 -7.3 s 0.1 -4.7 -3 -4.7 C 53 4 30 0 22.3 6 c -5.4 0 -5.9 8 -3.9 16 c -3.1 0 -3 3.8 -3 4.7 s 0.7 7.3 3.8 7.3 c 1 3.6 2.3 6.9 4.7 9 v 1.2 c 0 2 0.5 5 -9.5 6.8 S 2 62 2 62 h 60 a 14.6 14.6 0 0 0 -11.6 -11 z"
          strokeMiterlimit={10}
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}
