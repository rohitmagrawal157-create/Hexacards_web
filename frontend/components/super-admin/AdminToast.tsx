"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import {
  ADMIN_TOAST_EVENT,
  type AdminToastPayload,
} from "@/lib/admin-toast";

const AUTO_DISMISS_MS = 3200;

export default function AdminToast() {
  const [toasts, setToasts] = useState<AdminToastPayload[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<AdminToastPayload>).detail;
      if (!detail?.message) return;
      setToasts((prev) => [...prev, detail]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id));
      }, AUTO_DISMISS_MS);
    }

    window.addEventListener(ADMIN_TOAST_EVENT, onToast);
    return () => window.removeEventListener(ADMIN_TOAST_EVENT, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const Icon = isSuccess ? CheckCircle2 : XCircle;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-[0_12px_40px_rgba(20,20,20,0.14)] ${
              isSuccess
                ? "border-[#BC7C10]/20 bg-white text-[#141414]"
                : "border-[#E24C4C]/25 bg-white text-[#141414]"
            }`}
          >
            <Icon
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                isSuccess ? "text-[#BC7C10]" : "text-[#E24C4C]"
              }`}
            />
            <p className="flex-1 text-sm font-medium leading-snug">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="shrink-0 rounded-md p-0.5 text-[#8a8174] hover:bg-black/[0.04] hover:text-[#141414]"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
