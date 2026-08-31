import { apiFetch } from "@/lib/api-config";

/** Sync checkout contact details to the logged-in user row. */
export async function syncUserProfileFromCheckout(opts: {
  userId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
}): Promise<void> {
  if (!opts.userId || opts.userId <= 0) return;
  const payload: Record<string, string> = {};
  if (opts.firstName?.trim()) payload.firstName = opts.firstName.trim();
  if (opts.lastName !== undefined) payload.lastName = opts.lastName.trim();
  if (opts.email?.trim()) payload.email = opts.email.trim();
  if (Object.keys(payload).length === 0) return;

  const res = await apiFetch(`/api/users/${opts.userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.warn("[users] profile sync after checkout:", res.error);
  }
}
