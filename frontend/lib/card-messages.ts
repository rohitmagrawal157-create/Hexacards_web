import { apiFetch } from "@/lib/api-config";
import { getAuthUser, normalizeIndianPhone } from "@/lib/auth";

export type CardMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  message: string;
  createdAt: string;
  read: boolean;
};

const MESSAGES_KEY = "hexaCardMessages";

function readMessages(): CardMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CardMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) => ({
      ...m,
      website: typeof m.website === "string" ? m.website : "",
    }));
  } catch {
    return [];
  }
}

function writeMessages(messages: CardMessage[], notify = true) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(0, 100)));
  if (notify) {
    window.dispatchEvent(new Event("hexa-card-messages-change"));
  }
}

function toCardMessage(row: CardMessage & Record<string, unknown>): CardMessage {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    website: String(row.website ?? ""),
    message: String(row.message ?? ""),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    read: Boolean(row.read),
  };
}

/** Sync local cache — prefer fetchCardMessages() for dashboard. */
export function getCardMessages(): CardMessage[] {
  return readMessages().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function fetchCardMessages(opts?: {
  ownerPhone?: string;
  userId?: number;
}): Promise<CardMessage[]> {
  const auth = getAuthUser();
  const ownerPhone =
    normalizeIndianPhone(opts?.ownerPhone ?? "") ||
    normalizeIndianPhone(auth?.phone ?? "");
  const userId =
    (opts?.userId && opts.userId > 0 ? opts.userId : null) ||
    (auth?.userId && auth.userId > 0 ? auth.userId : null);

  const params = new URLSearchParams();
  if (userId) params.set("userId", String(userId));
  if (ownerPhone) params.set("ownerPhone", ownerPhone);

  if (!params.toString()) {
    return getCardMessages();
  }

  const res = await apiFetch<CardMessage[]>(
    `/api/messages?${params.toString()}`,
  );

  if (res.ok && Array.isArray(res.data)) {
    const mapped = res.data.map((d) =>
      toCardMessage(d as CardMessage & Record<string, unknown>),
    );
    if (typeof window !== "undefined") {
      try {
        writeMessages(mapped, false);
      } catch {
        // ignore quota
      }
    }
    return mapped;
  }

  return getCardMessages();
}

export function getUnreadMessageCount() {
  return getCardMessages().filter((m) => !m.read).length;
}

export async function saveCardMessage(input: {
  name: string;
  email: string;
  phone: string;
  website?: string;
  message: string;
  ownerPhone?: string;
  userId?: number | null;
  cardId?: number | null;
  cardSlug?: string | null;
}): Promise<CardMessage> {
  const ownerPhone = normalizeIndianPhone(input.ownerPhone ?? "");
  const cardId =
    input.cardId != null && Number(input.cardId) > 0
      ? Number(input.cardId)
      : null;
  const cardSlug = input.cardSlug?.trim().toLowerCase() || null;
  const userId =
    input.userId != null && Number(input.userId) > 0
      ? Number(input.userId)
      : null;

  const id = `MSG-${Date.now().toString().slice(-8)}`;
  const next: CardMessage = {
    id,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    website: (input.website || "").trim(),
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
    read: false,
  };

  const canRoute = Boolean(ownerPhone || cardId || cardSlug || userId);
  if (!canRoute) {
    throw new Error(
      "This card cannot receive messages right now. Ask the owner to open Edit card and Save once.",
    );
  }

  const res = await apiFetch<CardMessage>("/api/messages", {
    method: "POST",
    body: JSON.stringify({
      ...next,
      messageCode: id,
      ownerPhone: ownerPhone || undefined,
      userId,
      cardId,
      cardSlug,
    }),
  });

  if (res.ok && res.data) {
    const saved = toCardMessage(res.data as CardMessage & Record<string, unknown>);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("hexa-card-messages-change"));
    }
    return saved;
  }

  console.error(
    "[messages] Supabase save failed:",
    res.error,
    res.details,
  );
  throw new Error(
    res.error || "Could not send message. Please try again.",
  );
}

export async function markMessageRead(id: string) {
  const all = readMessages().map((m) =>
    m.id === id ? { ...m, read: true } : m,
  );
  writeMessages(all);

  const res = await apiFetch(`/api/messages/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ read: true }),
  });
  if (!res.ok) {
    console.error("[messages] mark read failed:", res.error);
  }
}

export async function markAllMessagesRead() {
  writeMessages(readMessages().map((m) => ({ ...m, read: true })));
  const auth = getAuthUser();
  const ownerPhone = normalizeIndianPhone(auth?.phone ?? "");
  if (!ownerPhone) return;

  const res = await apiFetch(`/api/messages/all`, {
    method: "PUT",
    body: JSON.stringify({ markAllForOwner: ownerPhone }),
  });
  if (!res.ok) {
    console.error("[messages] mark all read failed:", res.error);
  }
}

export async function deleteCardMessage(id: string) {
  writeMessages(readMessages().filter((m) => m.id !== id));
  const res = await apiFetch(`/api/messages/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    console.error("[messages] delete failed:", res.error);
  }
}

export function formatMessageDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Compact date for table columns — dd/mm/yyyy with time below */
export function formatMessageDateShort(iso: string) {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return {
      date: `${day}/${month}/${year}`,
      time,
    };
  } catch {
    return { date: iso, time: "" };
  }
}
