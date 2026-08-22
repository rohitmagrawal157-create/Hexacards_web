export type SuperAdminUser = {
  email: string;
  name: string;
  role: "super-admin";
  loggedInAt: string;
  /** ISO timestamp — updated on activity; session expires after idle TTL */
  lastActiveAt: string;
};

const ADMIN_AUTH_KEY = "hexaSuperAdminUser";

/** Idle timeout: require login again after this much inactivity */
export const SUPER_ADMIN_SESSION_MS = 15 * 60 * 1000; // 15 minutes

/** Demo credentials — replace with server auth in production */
export const DEMO_ADMIN_EMAIL = "admin@hexacards.com";
export const DEMO_ADMIN_PASSWORD = "superadmin123";

function isSessionExpired(user: SuperAdminUser): boolean {
  const lastActive = Date.parse(user.lastActiveAt || user.loggedInAt);
  if (!Number.isFinite(lastActive)) return true;
  return Date.now() - lastActive > SUPER_ADMIN_SESSION_MS;
}

export function getSuperAdminUser(): SuperAdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SuperAdminUser;
    if (parsed?.role !== "super-admin" || !parsed?.email) return null;

    const user: SuperAdminUser = {
      ...parsed,
      name: parsed.name?.trim() || "Super Admin",
      loggedInAt: parsed.loggedInAt || new Date().toISOString(),
      lastActiveAt: parsed.lastActiveAt || parsed.loggedInAt || new Date().toISOString(),
    };

    if (isSessionExpired(user)) {
      clearSuperAdminUser();
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export function isSuperAdminLoggedIn(): boolean {
  return Boolean(getSuperAdminUser()?.email);
}

/** Extend session on user activity while logged in (throttled). */
export function touchSuperAdminSession(): SuperAdminUser | null {
  if (typeof window === "undefined") return null;
  const user = getSuperAdminUser();
  if (!user) return null;

  const last = Date.parse(user.lastActiveAt);
  // Avoid rewriting storage on every click/key — refresh at most once per minute
  if (Number.isFinite(last) && Date.now() - last < 60_000) {
    return user;
  }

  const next: SuperAdminUser = {
    ...user,
    lastActiveAt: new Date().toISOString(),
  };
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(next));
  return next;
}

export function setSuperAdminUser(email: string, name: string): SuperAdminUser {
  const now = new Date().toISOString();
  const user: SuperAdminUser = {
    email: email.trim().toLowerCase(),
    name: name.trim() || "Super Admin",
    role: "super-admin",
    loggedInAt: now,
    lastActiveAt: now,
  };
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("hexa-super-admin-auth-change"));
  return user;
}

export function clearSuperAdminUser() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  window.dispatchEvent(new Event("hexa-super-admin-auth-change"));
}

export function verifySuperAdminCredentials(
  email: string,
  password: string,
): boolean {
  return (
    email.trim().toLowerCase() === DEMO_ADMIN_EMAIL &&
    password === DEMO_ADMIN_PASSWORD
  );
}

export function superAdminLoginPathWithNext(nextPath: string) {
  return `/super-admin/login?next=${encodeURIComponent(nextPath)}`;
}

export function formatSessionMinutes(): number {
  return Math.round(SUPER_ADMIN_SESSION_MS / 60000);
}
