export type HexaAuthUser = {
  phone: string;
  name: string;
  loggedInAt: string;
};

const AUTH_KEY = "hexaAuthUser";
const PENDING_OTP_KEY = "hexaPendingOtp";

export function getAuthUser(): HexaAuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HexaAuthUser;
    if (!parsed?.phone) return null;
    return {
      ...parsed,
      name: parsed.name?.trim() || "User",
    };
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getAuthUser()?.phone);
}

export function setAuthUser(phone: string, name: string): HexaAuthUser {
  const user: HexaAuthUser = {
    phone: phone.replace(/\D/g, "").slice(-10),
    name: name.trim(),
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("hexa-auth-change"));
  return user;
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(PENDING_OTP_KEY);
  window.dispatchEvent(new Event("hexa-auth-change"));
}

export function normalizeIndianPhone(input: string): string {
  return input.replace(/\D/g, "").slice(-10);
}

export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianPhone(phone));
}

/** Demo OTP flow — stores a code in sessionStorage (no SMS API yet) */
export function issueDemoOtp(phone: string): string {
  const code = "123456";
  sessionStorage.setItem(
    PENDING_OTP_KEY,
    JSON.stringify({
      phone: normalizeIndianPhone(phone),
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    }),
  );
  return code;
}

export function verifyDemoOtp(phone: string, otp: string): boolean {
  try {
    const raw = sessionStorage.getItem(PENDING_OTP_KEY);
    if (!raw) return false;
    const pending = JSON.parse(raw) as {
      phone: string;
      code: string;
      expiresAt: number;
    };
    if (Date.now() > pending.expiresAt) return false;
    if (pending.phone !== normalizeIndianPhone(phone)) return false;
    return pending.code === otp.trim();
  } catch {
    return false;
  }
}

/** Navigate to checkout if logged in; otherwise send to login with return URL */
export function goToCheckout(
  router: { push: (href: string) => void },
  nextPath = "/checkout",
) {
  if (isLoggedIn()) {
    router.push(nextPath);
    return;
  }
  const next = encodeURIComponent(nextPath);
  router.push(`/login?next=${next}`);
}

export function loginPathWithNext(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}
