/** Shared outer shell for digital card layouts. */
export function cardShellClass(publicView: boolean): string {
  if (publicView) {
    return [
      "mx-auto w-full max-w-none min-h-[100dvh] overflow-x-hidden",
      "rounded-none border-0 bg-white shadow-none",
    ].join(" ");
  }

  return "mx-auto max-w-[520px] overflow-hidden rounded-2xl border-2 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]";
}

/** Page wrapper for shared public card links (mobile-first, edge-to-edge). */
export function publicCardPageClass(isOwner: boolean): string {
  return isOwner
    ? "min-h-screen bg-[#F4F5F7]"
    : "min-h-[100dvh] bg-white";
}
