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
