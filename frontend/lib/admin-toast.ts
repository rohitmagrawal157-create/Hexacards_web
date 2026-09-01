export type AdminToastType = "success" | "error";

export type AdminToastPayload = {
  id: string;
  message: string;
  type: AdminToastType;
};

export const ADMIN_TOAST_EVENT = "hexa-admin-toast";

export function showAdminToast(
  message: string,
  type: AdminToastType = "success",
) {
  if (typeof window === "undefined") return;
  const detail: AdminToastPayload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    type,
  };
  window.dispatchEvent(new CustomEvent(ADMIN_TOAST_EVENT, { detail }));
}

/** User-friendly copy for Super Admin user API errors. */
export function formatAdminUserErrorMessage(error?: string): string {
  const raw = String(error ?? "").trim().toLowerCase();

  if (
    raw.includes("mobile number already registered") ||
    raw.includes("already registered")
  ) {
    return "This mobile number is already registered. Please use a different number.";
  }
  if (raw.includes("valid 10-digit mobile")) {
    return "Please enter a valid 10-digit mobile number.";
  }
  if (raw.includes("first_name is required")) {
    return "First name is required.";
  }
  if (raw.includes("user not found")) {
    return "This user could not be found. Refresh the page and try again.";
  }

  const trimmed = String(error ?? "").trim();
  if (trimmed) return trimmed;
  return "Unable to save user. Please try again.";
}
