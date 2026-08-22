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

function writeMessages(messages: CardMessage[]) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(0, 100)));
  window.dispatchEvent(new Event("hexa-card-messages-change"));
}

export function getCardMessages(): CardMessage[] {
  return readMessages().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getUnreadMessageCount() {
  return getCardMessages().filter((m) => !m.read).length;
}

export function saveCardMessage(input: {
  name: string;
  email: string;
  phone: string;
  website?: string;
  message: string;
}): CardMessage {
  const next: CardMessage = {
    id: `MSG-${Date.now().toString().slice(-8)}`,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    website: (input.website || "").trim(),
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  const all = readMessages();
  all.unshift(next);
  writeMessages(all);
  return next;
}

export function markMessageRead(id: string) {
  const all = readMessages().map((m) =>
    m.id === id ? { ...m, read: true } : m,
  );
  writeMessages(all);
}

export function markAllMessagesRead() {
  writeMessages(readMessages().map((m) => ({ ...m, read: true })));
}

export function deleteCardMessage(id: string) {
  writeMessages(readMessages().filter((m) => m.id !== id));
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
