import { apiFetch } from "@/lib/api-config";
import { fetchOrders, getOrders, type HexaOrder } from "@/lib/orders";
import type { CardDto } from "@/lib/server/card-types";
import type { UserDto } from "@/lib/server/user-types";
import {
  isCardProductOrder,
  orderToDashboardCard,
} from "@/lib/user-cards";

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
  overrides: Record<
    string,
    Partial<
      Pick<AdminCardRecord, "startDate" | "expiryDate" | "active" | "pageViews">
    >
  >;
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

function formatShortDateDashed(value: string | Date): string {
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
  if (Number.isNaN(date.getTime())) return formatShortDateDashed(new Date());
  date.setFullYear(date.getFullYear() + years);
  return formatShortDateDashed(date);
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
    const phone = (order.ownerPhone || order.phone || "")
      .replace(/\D/g, "")
      .slice(-10);
    if (!phone) continue;
    const list = byPhone.get(phone) ?? [];
    list.push(order);
    byPhone.set(phone, list);
  }

  const rows: AdminUserRecord[] = [];
  for (const [phone, list] of byPhone) {
    const sorted = [...list].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const { firstName, lastName } = splitName(
      latest.customerName || "Customer",
    );
    rows.push({
      id: phoneId(phone),
      srNo: 0,
      firstName,
      lastName,
      email: latest.email?.trim() || "",
      mobile: phone,
      regDate: formatShortDateDashed(first.createdAt),
      active: true,
    });
  }
  return rows;
}

function userDtoToAdmin(user: UserDto): AdminUserRecord {
  return {
    id: `db-${user.userId}`,
    srNo: 0,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email?.trim() || "",
    mobile: user.mobile,
    regDate: formatShortDateDashed(user.dateTime),
    active: user.status,
  };
}

function cardDtoToAdmin(card: CardDto): AdminCardRecord {
  const slug = card.unicCardName;
  return {
    id: `card-${card.cardId}`,
    srNo: 0,
    name: card.cardName || slug,
    liveUrl: `https://hexacards.com/${slug}`,
    email: card.email?.trim() || "",
    mobile: (card.mobile || "").replace(/\D/g, "").slice(-10),
    startDate: card.startDate
      ? formatShortDateDashed(card.startDate)
      : formatShortDateDashed(card.dateTime),
    expiryDate: card.endDate
      ? formatShortDateDashed(card.endDate)
      : addYears(card.dateTime, 20),
    pageViews: card.pageView || 0,
    editHref: `/super-admin?tab=cards`,
    active: card.status,
  };
}

function slugFromLiveUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\/[^/]+\//, "").toLowerCase();
  }
}

function orderToAdminCard(order: HexaOrder): AdminCardRecord {
  const card = orderToDashboardCard(order, false);
  const id =
    order.cardId && order.cardId > 0 ? `card-${order.cardId}` : order.id;
  return {
    id,
    srNo: 0,
    name: card.slug || card.name,
    liveUrl: card.publicUrl,
    email: order.email?.trim() || "",
    mobile: (order.ownerPhone || order.phone || "")
      .replace(/\D/g, "")
      .slice(-10),
    startDate: formatShortDateDashed(order.createdAt),
    expiryDate: addYears(order.createdAt, 20),
    pageViews: 0,
    editHref: `/super-admin?tab=cards`,
    active: true,
  };
}

/** Merge DB cards with order-derived cards; DB wins on overlapping fields. */
function mergeAdminCards(
  dbRows: AdminCardRecord[],
  orderRows: AdminCardRecord[],
): AdminCardRecord[] {
  const map = new Map<string, AdminCardRecord>();

  for (const row of orderRows) {
    const key = slugFromLiveUrl(row.liveUrl) || row.id;
    map.set(key, row);
  }

  for (const row of dbRows) {
    const key = slugFromLiveUrl(row.liveUrl) || row.id;
    const prev = map.get(key);
    map.set(key, {
      ...prev,
      ...row,
      id: row.id.startsWith("card-") ? row.id : (prev?.id ?? row.id),
      name: row.name || prev?.name || key,
      email: row.email || prev?.email || "",
      mobile: row.mobile || prev?.mobile || "",
      pageViews: row.pageViews ?? prev?.pageViews ?? 0,
      startDate: row.startDate || prev?.startDate || "",
      expiryDate: row.expiryDate || prev?.expiryDate || "",
      active: row.active,
      liveUrl: row.liveUrl || prev?.liveUrl || "",
    });
  }

  return Array.from(map.values());
}

function assignSrNos<T extends { srNo: number }>(rows: T[]): T[] {
  return rows.map((row, index) => ({ ...row, srNo: rows.length - index }));
}

/** Sync local cache — prefer fetchAdminUsers() for admin UI. */
export function getAdminUsers(): AdminUserRecord[] {
  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  const fromOrders = usersFromOrders(getOrders());
  const extras = store.extras.filter(
    (user) =>
      !store.deletedIds.includes(user.id) &&
      !fromOrders.some((row) => row.id === user.id),
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

/** Load users from Supabase `users` table; falls back to order-derived list. */
export async function fetchAdminUsers(): Promise<AdminUserRecord[]> {
  const res = await apiFetch<UserDto[]>("/api/users");
  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
    const rows = res.data
      .map(userDtoToAdmin)
      .filter((u) => !store.deletedIds.includes(u.id))
      .map((u) => ({ ...u, ...store.overrides[u.id] }));
    return assignSrNos(
      rows.sort(
        (a, b) =>
          new Date(b.regDate.replace(/-/g, " ")).getTime() -
          new Date(a.regDate.replace(/-/g, " ")).getTime(),
      ),
    );
  }

  await fetchOrders();
  return getAdminUsers();
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

  void apiFetch("/api/users", {
    method: "POST",
    body: JSON.stringify({
      firstName: user.firstName,
      lastName: user.lastName,
      mobile: user.mobile,
      email: user.email || null,
    }),
  }).then((res) => {
    if (!res.ok) {
      console.error("[admin-users] DB create failed:", res.error);
    }
  });

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

  const dbId = id.startsWith("db-") ? Number(id.slice(3)) : null;
  if (dbId && Number.isInteger(dbId) && dbId > 0) {
    void apiFetch(`/api/users/${dbId}`, {
      method: "PATCH",
      body: JSON.stringify({
        firstName: patch.firstName,
        lastName: patch.lastName,
        email: patch.email,
        mobile: patch.mobile,
        status: patch.active === undefined ? undefined : patch.active ? 1 : 0,
      }),
    }).then((res) => {
      if (!res.ok) console.error("[admin-users] DB update failed:", res.error);
    });
  }
}

export function deleteAdminUser(id: string) {
  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  if (!store.deletedIds.includes(id)) store.deletedIds.push(id);
  store.extras = store.extras.filter((user) => user.id !== id);
  delete store.overrides[id];
  writeJson(USERS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));

  const dbId = id.startsWith("db-") ? Number(id.slice(3)) : null;
  if (dbId && Number.isInteger(dbId) && dbId > 0) {
    void apiFetch(`/api/users/${dbId}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) console.error("[admin-users] DB delete failed:", res.error);
    });
  }
}

export function toggleAdminUser(id: string, active: boolean) {
  updateAdminUser(id, { active });
}

/** Sync local cache — prefer fetchAdminCards() for admin UI. */
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
        mobile: (order.ownerPhone || order.phone || "")
          .replace(/\D/g, "")
          .slice(-10),
        startDate: override.startDate || formatShortDateDashed(order.createdAt),
        expiryDate: override.expiryDate || addYears(order.createdAt, 20),
        pageViews: override.pageViews ?? 0,
        editHref: `/super-admin?tab=cards`,
        active: override.active ?? true,
      } satisfies AdminCardRecord;
    });

  return assignSrNos(rows);
}

/** Load cards from Supabase + orders (merged); backfills missing DB rows first. */
export async function fetchAdminCards(): Promise<AdminCardRecord[]> {
  const store = readJson<CardsStore>(CARDS_KEY, emptyCardsStore());

  try {
    await apiFetch<{ synced: number; linked: number }>(
      "/api/cards/sync-from-orders",
      { method: "POST" },
    );
  } catch {
    // sync is best-effort — still show merged list from API + orders
  }

  const [cardsRes, orders] = await Promise.all([
    apiFetch<CardDto[]>("/api/cards"),
    fetchOrders(),
  ]);

  const dbRows =
    cardsRes.ok && Array.isArray(cardsRes.data)
      ? cardsRes.data
          .map(cardDtoToAdmin)
          .filter((c) => !store.deletedIds.includes(c.id))
      : [];

  const orderRows = orders
    .filter(isCardProductOrder)
    .filter((o) => {
      const dbId = o.cardId && o.cardId > 0 ? `card-${o.cardId}` : null;
      return (
        !store.deletedIds.includes(o.id) &&
        (!dbId || !store.deletedIds.includes(dbId))
      );
    })
    .map(orderToAdminCard);

  const merged = mergeAdminCards(dbRows, orderRows).map((c) => ({
    ...c,
    ...store.overrides[c.id],
  }));

  return assignSrNos(
    merged.sort(
      (a, b) =>
        new Date(b.startDate.replace(/-/g, " ")).getTime() -
        new Date(a.startDate.replace(/-/g, " ")).getTime(),
    ),
  );
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

  const dbId = id.startsWith("card-") ? Number(id.slice(5)) : null;
  if (dbId && Number.isInteger(dbId) && dbId > 0) {
    void apiFetch(`/api/cards/${dbId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: patch.active === undefined ? undefined : patch.active ? 1 : 0,
        startDate: patch.startDate || undefined,
        endDate: patch.expiryDate || undefined,
      }),
    }).then((res) => {
      if (!res.ok) console.error("[admin-cards] DB update failed:", res.error);
    });
  }
}

export function deleteAdminCard(id: string) {
  const store = readJson<CardsStore>(CARDS_KEY, emptyCardsStore());
  if (!store.deletedIds.includes(id)) store.deletedIds.push(id);
  delete store.overrides[id];
  writeJson(CARDS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));

  const dbId = id.startsWith("card-") ? Number(id.slice(5)) : null;
  if (dbId && Number.isInteger(dbId) && dbId > 0) {
    void apiFetch(`/api/cards/${dbId}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) console.error("[admin-cards] DB delete failed:", res.error);
    });
  }
}

export function toggleAdminCard(id: string, active: boolean) {
  updateAdminCard(id, { active });
}
