import { getOrders, type HexaOrder } from "@/lib/orders";
import { isCardProductOrder, orderToDashboardCard } from "@/lib/user-cards";

export type AdminUserRecord = {
  id: string;
  srNo: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  regDate: string;
  active: boolean;
};

export type AdminCardRecord = {
  id: string;
  srNo: number;
  name: string;
  liveUrl: string;
  email: string;
  mobile: string;
  startDate: string;
  expiryDate: string;
  pageViews: number;
  editHref: string;
  active: boolean;
};

type UsersStore = {
  extras: AdminUserRecord[];
  overrides: Record<string, Partial<AdminUserRecord>>;
  deletedIds: string[];
};

type CardsStore = {
  overrides: Record<string, Partial<Pick<AdminCardRecord, "startDate" | "expiryDate" | "active" | "pageViews">>>;
  deletedIds: string[];
};

const USERS_KEY = "hexaAdminUsers";
const CARDS_KEY = "hexaAdminCards";

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function formatShortDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");
}

function addYears(iso: string, years: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatShortDate(new Date());
  date.setFullYear(date.getFullYear() + years);
  return formatShortDate(date);
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function emptyUsersStore(): UsersStore {
  return { extras: [], overrides: {}, deletedIds: [] };
}

function emptyCardsStore(): CardsStore {
  return { overrides: {}, deletedIds: [] };
}

function phoneId(phone: string) {
  return `u-${phone.replace(/\D/g, "").slice(-10) || phone}`;
}

function usersFromOrders(orders: HexaOrder[]): AdminUserRecord[] {
  const byPhone = new Map<string, HexaOrder[]>();
  for (const order of orders) {
    const phone = (order.ownerPhone || order.phone || "").replace(/\D/g, "").slice(-10);
    if (!phone) continue;
    const list = byPhone.get(phone) ?? [];
    list.push(order);
    byPhone.set(phone, list);
  }

  const rows: AdminUserRecord[] = [];
  for (const [phone, list] of byPhone) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const { firstName, lastName } = splitName(latest.customerName || "Customer");
    rows.push({
      id: phoneId(phone),
      srNo: 0,
      firstName,
      lastName,
      email: latest.email?.trim() || "",
      mobile: phone,
      regDate: formatShortDate(first.createdAt),
      active: true,
    });
  }
  return rows;
}

function assignSrNos<T extends { srNo: number }>(rows: T[]): T[] {
  return rows.map((row, index) => ({ ...row, srNo: rows.length - index }));
}

export function getAdminUsers(): AdminUserRecord[] {
  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  const fromOrders = usersFromOrders(getOrders());
  const extras = store.extras.filter(
    (user) => !store.deletedIds.includes(user.id) && !fromOrders.some((row) => row.id === user.id),
  );
  const merged = [...fromOrders, ...extras]
    .filter((user) => !store.deletedIds.includes(user.id))
    .map((user) => ({ ...user, ...store.overrides[user.id] }));

  return assignSrNos(
    merged.sort((a, b) => {
      const aTime = new Date(a.regDate.replace(/-/g, " ")).getTime();
      const bTime = new Date(b.regDate.replace(/-/g, " ")).getTime();
      return bTime - aTime;
    }),
  );
}

export function addAdminUser(
  user: Omit<AdminUserRecord, "id" | "srNo"> & { id?: string },
): AdminUserRecord {
  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  const id = user.id || phoneId(user.mobile) || `u-${Date.now().toString(36)}`;
  const created: AdminUserRecord = {
    ...user,
    id,
    srNo: 0,
  };
  store.deletedIds = store.deletedIds.filter((item) => item !== id);
  store.extras = [created, ...store.extras.filter((item) => item.id !== id)];
  writeJson(USERS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));
  return created;
}

export function updateAdminUser(id: string, patch: Partial<AdminUserRecord>) {
  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  store.overrides[id] = { ...store.overrides[id], ...patch };
  store.extras = store.extras.map((user) =>
    user.id === id ? { ...user, ...patch } : user,
  );
  writeJson(USERS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));
}

export function deleteAdminUser(id: string) {
  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  if (!store.deletedIds.includes(id)) store.deletedIds.push(id);
  store.extras = store.extras.filter((user) => user.id !== id);
  delete store.overrides[id];
  writeJson(USERS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));
}

export function toggleAdminUser(id: string, active: boolean) {
  updateAdminUser(id, { active });
}

export function getAdminCards(): AdminCardRecord[] {
  const store = readJson<CardsStore>(CARDS_KEY, emptyCardsStore());
  const orders = getOrders().filter(isCardProductOrder);
  const rows = orders
    .filter((order) => !store.deletedIds.includes(order.id))
    .map((order) => {
      const card = orderToDashboardCard(order, false);
      const override = store.overrides[order.id] ?? {};
      return {
        id: order.id,
        srNo: 0,
        name: card.slug || card.name,
        liveUrl: card.publicUrl,
        email: order.email?.trim() || "",
        mobile: (order.ownerPhone || order.phone || "").replace(/\D/g, "").slice(-10),
        startDate: override.startDate || formatShortDate(order.createdAt),
        expiryDate: override.expiryDate || addYears(order.createdAt, 20),
        pageViews: override.pageViews ?? 0,
        editHref: `/super-admin?tab=cards`,
        active: override.active ?? true,
      } satisfies AdminCardRecord;
    });

  return assignSrNos(rows);
}

export function updateAdminCard(id: string, patch: Partial<AdminCardRecord>) {
  const store = readJson<CardsStore>(CARDS_KEY, emptyCardsStore());
  store.overrides[id] = {
    ...store.overrides[id],
    startDate: patch.startDate ?? store.overrides[id]?.startDate,
    expiryDate: patch.expiryDate ?? store.overrides[id]?.expiryDate,
    active: patch.active ?? store.overrides[id]?.active,
    pageViews: patch.pageViews ?? store.overrides[id]?.pageViews,
  };
  writeJson(CARDS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));
}

export function deleteAdminCard(id: string) {
  const store = readJson<CardsStore>(CARDS_KEY, emptyCardsStore());
  if (!store.deletedIds.includes(id)) store.deletedIds.push(id);
  delete store.overrides[id];
  writeJson(CARDS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));
}

export function toggleAdminCard(id: string, active: boolean) {
  updateAdminCard(id, { active });
}
