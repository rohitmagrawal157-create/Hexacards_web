type HexNetworkBackgroundProps = {
  /** Prefix SVG paint-server ids so multiple instances don't clash */
  idPrefix?: string;
};

/**
 * Soft hex mesh ambient background — used by landing hero and super-admin login.
 */
export default function HexNetworkBackground({
  idPrefix = "hex",
}: HexNetworkBackgroundProps) {
  const tile = `${idPrefix}-tile`;
  const reveal = `${idPrefix}-reveal`;
  const topFade = `${idPrefix}-top`;
  const bottomFade = `${idPrefix}-bottom`;

  return (
    <div
      className="hero-hex-bg pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-white" />

      <svg
        className="hero-hex-mesh absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id={tile}
            width="110"
            height="95"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M55 4 L103 32 L103 68 L55 96 L7 68 L7 32 Z"
              fill="none"
              stroke="#64748b"
              strokeOpacity="0.14"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M110 51.5 L158 79.5 L158 115.5 L110 143.5 L62 115.5 L62 79.5 Z"
              fill="none"
              stroke="#64748b"
              strokeOpacity="0.11"
              strokeWidth="1"
              strokeLinejoin="round"
              transform="translate(-55 -47.5)"
            />
          </pattern>

          <radialGradient id={reveal} cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="60%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0.85" />
          </radialGradient>

          <linearGradient id={topFade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="18%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={bottomFade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="78%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill={`url(#${tile})`} />
        <rect width="100%" height="100%" fill={`url(#${reveal})`} />
        <rect width="100%" height="100%" fill={`url(#${topFade})`} />
        <rect width="100%" height="100%" fill={`url(#${bottomFade})`} />
      </svg>
    </div>
  );
}
