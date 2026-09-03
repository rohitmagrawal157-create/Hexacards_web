"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

/** Uiverse.io by boryanakrasteva — 7 hex cells around a 24×24 origin. */
const HEX_CELLS: { left: number; top: number; delay: string }[] = [
  { left: -28, top: 0, delay: "0s" },
  { left: -14, top: 22, delay: "0.1s" },
  { left: 14, top: 22, delay: "0.2s" },
  { left: 28, top: 0, delay: "0.3s" },
  { left: 14, top: -22, delay: "0.4s" },
  { left: -14, top: -22, delay: "0.5s" },
  { left: 0, top: 0, delay: "0.6s" },
];

const HEX_CELL_CLASS =
  "pointer-events-none absolute mt-1.5 h-3 w-6 origin-center animate-honeycomb bg-current " +
  "before:absolute before:bottom-[-6px] before:left-0 before:right-0 before:border-x-[12px] before:border-t-[6px] before:border-x-transparent before:border-t-current before:content-[''] " +
  "after:absolute after:left-0 after:right-0 after:top-[-6px] after:border-x-[12px] after:border-b-[6px] after:border-x-transparent after:border-b-current after:content-['']";

type HoneycombLoaderProps = {
  className?: string;
  color?: string;
  /** `sm` buttons · `md` dialogs · `lg` full-page status */
  size?: "sm" | "md" | "lg";
};

const LOADER_SCALE = { sm: 0.42, md: 0.52, lg: 0.72 } as const;
/** Uiverse cluster + hex point caps (bottom triangles need extra height). */
const LOADER_BASE_W = 80;
const LOADER_BASE_H = 80;

export function HoneycombLoader({
  className = "",
  color,
  size = "sm",
}: HoneycombLoaderProps) {
  const scale = LOADER_SCALE[size];

  return (
    <div
      className={[
        "relative mx-auto flex shrink-0 items-center justify-center overflow-visible",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: LOADER_BASE_W * scale,
        height: LOADER_BASE_H * scale,
        color,
      }}
      role="status"
      aria-label="Loading"
      aria-live="polite"
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: LOADER_BASE_W,
          height: LOADER_BASE_H,
          transform: `scale(${scale})`,
        }}
      >
        <div className="absolute left-7 top-7 h-6 w-6">
          {HEX_CELLS.map((cell) => (
            <div
              key={`${cell.left}-${cell.top}`}
              className={HEX_CELL_CLASS}
              style={
                {
                  left: cell.left,
                  top: cell.top,
                  animationDelay: cell.delay,
                } as CSSProperties
              }
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Alias for 21st.dev-style `import { Component as HoneycombLoader }`. */
export const Component = HoneycombLoader;

export function HoneycombPageStatus({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className={["text-center", className].filter(Boolean).join(" ")}>
      <HoneycombLoader size="lg" className="text-[#BC7C10]" />
      <p className="mt-3 text-sm font-medium text-[#5c5346]">{label}</p>
    </div>
  );
}

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  children?: ReactNode;
};

export function SubmitButton({
  loading = false,
  children = "Submit",
  className = "",
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-busy={loading}
      className={["flex items-center justify-center gap-2", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? <HoneycombLoader /> : children}
    </button>
  );
}
