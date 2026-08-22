/**
 * Invisible reCAPTCHA v2 helpers.
 *
 * Flow:
 * 1. Load Google’s script (public site key only).
 * 2. On submit, execute invisible challenge → token.
 * 3. POST token to /api/recaptcha/verify (secret stays on server).
 * 4. Accept the form only after Google confirms the token.
 */

const DEV_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ||
  (process.env.NODE_ENV !== "production" ? DEV_SITE_KEY : "");

export function isRecaptchaConfigured() {
  return Boolean(RECAPTCHA_SITE_KEY);
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          size?: "invisible" | "compact" | "normal";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          badge?: "bottomright" | "bottomleft" | "inline";
        },
      ) => number;
      execute: (widgetId?: number) => void;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

type PendingCaptcha = {
  resolve: (token: string) => void;
  reject: (err: Error) => void;
};

const pendingByWidget = new Map<number, PendingCaptcha>();
const widgetByContainer = new WeakMap<HTMLElement, number>();

export function loadRecaptchaScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("reCAPTCHA is browser-only"));
  }
  if (window.grecaptcha?.render) {
    return new Promise((resolve) => {
      window.grecaptcha!.ready(() => resolve());
    });
  }
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      const g = window.grecaptcha;
      if (!g?.ready) {
        reject(new Error("reCAPTCHA failed to initialize"));
        return;
      }
      g.ready(() => resolve());
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-hexa-recaptcha="v2"]',
    );
    if (existing) {
      if (window.grecaptcha?.render) {
        finish();
        return;
      }
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load reCAPTCHA")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.hexaRecaptcha = "v2";
    script.onload = finish;
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error("Failed to load reCAPTCHA"));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export async function ensureInvisibleRecaptcha(
  container: HTMLElement,
): Promise<number> {
  if (!RECAPTCHA_SITE_KEY) {
    throw new Error("reCAPTCHA site key is not configured");
  }

  const existing = widgetByContainer.get(container);
  if (existing !== undefined) return existing;

  await loadRecaptchaScript();
  const g = window.grecaptcha;
  if (!g) throw new Error("reCAPTCHA failed to initialize");

  return new Promise((resolve, reject) => {
    g.ready(() => {
      try {
        // Do not use display:none — Google often fails to render there.
        const widgetId = g.render(container, {
          sitekey: RECAPTCHA_SITE_KEY,
          size: "invisible",
          badge: "bottomright",
          callback: (token: string) => {
            const pending = pendingByWidget.get(widgetId);
            if (pending) {
              pendingByWidget.delete(widgetId);
              pending.resolve(token);
            }
          },
          "error-callback": () => {
            const pending = pendingByWidget.get(widgetId);
            if (pending) {
              pendingByWidget.delete(widgetId);
              pending.reject(new Error("reCAPTCHA error. Please try again."));
            }
          },
          "expired-callback": () => {
            const pending = pendingByWidget.get(widgetId);
            if (pending) {
              pendingByWidget.delete(widgetId);
              pending.reject(new Error("reCAPTCHA expired. Please try again."));
            }
          },
        });
        widgetByContainer.set(container, widgetId);
        resolve(widgetId);
      } catch (err) {
        // Already rendered into this node (e.g. React Strict Mode)
        const reused = widgetByContainer.get(container);
        if (reused !== undefined) {
          resolve(reused);
          return;
        }
        reject(
          err instanceof Error ? err : new Error("reCAPTCHA render failed"),
        );
      }
    });
  });
}

export function executeInvisibleRecaptcha(widgetId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const g = window.grecaptcha;
    if (!g) {
      reject(new Error("reCAPTCHA is not ready"));
      return;
    }

    pendingByWidget.set(widgetId, { resolve, reject });
    try {
      g.reset(widgetId);
      g.execute(widgetId);
    } catch (err) {
      pendingByWidget.delete(widgetId);
      reject(err instanceof Error ? err : new Error("reCAPTCHA execute failed"));
    }

    window.setTimeout(() => {
      if (pendingByWidget.has(widgetId)) {
        pendingByWidget.delete(widgetId);
        reject(new Error("reCAPTCHA timed out. Please try again."));
      }
    }, 30_000);
  });
}

/** Full client flow: ensure widget → execute → return token */
export async function getInvisibleRecaptchaToken(
  container: HTMLElement,
): Promise<string> {
  const widgetId = await ensureInvisibleRecaptcha(container);
  return executeInvisibleRecaptcha(widgetId);
}

export async function verifyRecaptchaOnServer(token: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const res = await fetch("/api/recaptcha/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || "reCAPTCHA verification failed" };
  }
  return { ok: true };
}
