import { apiFetch } from "@/lib/api-config";
import {
  CARD_VALIDITY_YEARS,
  computeCardEndDateIso,
} from "@/lib/card-validity";
import {
  formatAdminUserErrorMessage,
  showAdminToast,
} from "@/lib/admin-toast";
import {
  applyHiddenOrdersToLocalCache,
  fetchOrders,
  getOrders,
  isOrderDashboardHidden,
  prependOrderToLocalCache,
  type HexaOrder,
} from "@/lib/orders";
import { resolveOrderLiveUrl } from "@/lib/order-card";
import { initOrderCardProfileAsync, removeOrderCardProfile } from "@/lib/order-card-profile";
import type { CardDto } from "@/lib/server/card-types";
import type { OrderDto } from "@/lib/server/order-types";
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
  /** Recently provisioned cards — merged until the next successful /api/cards load */
  extras: AdminCardRecord[];
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
  return { extras: [], overrides: {}, deletedIds: [] };
}

function readCardsStore(): CardsStore {
  const store = readJson<CardsStore>(CARDS_KEY, emptyCardsStore());
  return {
    extras: Array.isArray(store.extras) ? store.extras : [],
    overrides: store.overrides ?? {},
    deletedIds: Array.isArray(store.deletedIds) ? store.deletedIds : [],
  };
}

function cacheProvisionedAdminCard(card: AdminCardRecord, orderCode?: string) {
  const store = readCardsStore();
  store.deletedIds = store.deletedIds.filter(
    (id) => id !== card.id && (!orderCode || id !== orderCode),
  );
  store.extras = [
    card,
    ...store.extras.filter((row) => row.id !== card.id),
  ];
  writeJson(CARDS_KEY, store);
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
      : addYears(card.dateTime, CARD_VALIDITY_YEARS),
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

function adminCardIdNumeric(id: string): number | null {
  const match = id.match(/^card-(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function adminCardMergeKey(row: AdminCardRecord): string {
  const cardNum = adminCardIdNumeric(row.id);
  if (cardNum != null) return `card:${cardNum}`;
  const slug = slugFromLiveUrl(row.liveUrl);
  if (slug) return `slug:${slug}`;
  return `id:${row.id}`;
}

/** Stable unique key for React lists — one row per DB card or order-only profile. */
export function adminCardListKey(row: AdminCardRecord): string {
  return adminCardMergeKey(row);
}

function mergeAdminCardRow(
  existing: AdminCardRecord,
  incoming: AdminCardRecord,
  preferIncoming: boolean,
): AdminCardRecord {
  const primary = preferIncoming
    ? { ...existing, ...incoming }
    : { ...incoming, ...existing };
  const preferredId = preferIncoming
    ? incoming.id
    : existing.id.startsWith("card-")
      ? existing.id
      : incoming.id.startsWith("card-")
        ? incoming.id
        : primary.id;

  return {
    ...primary,
    id: preferredId,
    name: (preferIncoming ? incoming.name : existing.name) || primary.name,
    liveUrl:
      (preferIncoming ? incoming.liveUrl : existing.liveUrl) || primary.liveUrl,
    email: primary.email || existing.email || incoming.email,
    mobile: primary.mobile || existing.mobile || incoming.mobile,
    startDate: primary.startDate || existing.startDate || incoming.startDate,
    expiryDate:
      primary.expiryDate || existing.expiryDate || incoming.expiryDate,
    pageViews: Math.max(existing.pageViews, incoming.pageViews),
    active: preferIncoming ? incoming.active : existing.active,
    editHref: primary.editHref,
    srNo: primary.srNo,
  };
}

function dedupeAdminCardsById(rows: AdminCardRecord[]): AdminCardRecord[] {
  const map = new Map<string, AdminCardRecord>();
  for (const row of rows) {
    const key = adminCardMergeKey(row);
    const prev = map.get(key);
    map.set(
      key,
      prev
        ? mergeAdminCardRow(prev, row, row.id.startsWith("card-"))
        : row,
    );
  }
  return Array.from(map.values());
}

function orderExpiryDate(order: HexaOrder): string {
  const endIso = computeCardEndDateIso(order.createdAt, order.productId);
  if (endIso) return formatShortDateDashed(endIso);
  return addYears(order.createdAt, CARD_VALIDITY_YEARS);
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
    expiryDate: orderExpiryDate(order),
    pageViews: 0,
    editHref: `/super-admin?tab=cards`,
    active: true,
  };
}

/** Merge DB cards with order-only rows. Keyed by card_id, then slug — never duplicates. */
function mergeAdminCards(
  dbRows: AdminCardRecord[],
  orderRows: AdminCardRecord[],
): AdminCardRecord[] {
  const map = new Map<string, AdminCardRecord>();

  for (const row of orderRows) {
    const key = adminCardMergeKey(row);
    const prev = map.get(key);
    map.set(key, prev ? mergeAdminCardRow(prev, row, false) : row);
  }

  for (const row of dbRows) {
    const key = adminCardMergeKey(row);
    const prev = map.get(key);
    map.set(key, prev ? mergeAdminCardRow(prev, row, true) : row);
  }

  return dedupeAdminCardsById(Array.from(map.values()));
}

function parseRegDate(value: string): number {
  const parsed = new Date(String(value ?? "").replace(/-/g, " "));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function userIdFromAdminId(id: string): number {
  if (id.startsWith("db-")) {
    const n = Number(id.slice(3));
    return Number.isInteger(n) ? n : 0;
  }
  return 0;
}

/** Newest users first — reg date, then DB user id. */
function sortAdminUsers<T extends AdminUserRecord>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const dateDiff = parseRegDate(b.regDate) - parseRegDate(a.regDate);
    if (dateDiff !== 0) return dateDiff;
    return userIdFromAdminId(b.id) - userIdFromAdminId(a.id);
  });
}

function assignSrNos<T extends { srNo: number }>(rows: T[]): T[] {
  return rows.map((row, index) => ({ ...row, srNo: rows.length - index }));
}

function mergeAdminUserRows(
  dbRows: AdminUserRecord[],
  store: UsersStore,
): AdminUserRecord[] {
  const dbMobiles = new Set(dbRows.map((u) => u.mobile.replace(/\D/g, "").slice(-10)));
  const dbIds = new Set(dbRows.map((u) => u.id));

  const fromOrders = usersFromOrders(getOrders()).filter(
    (user) =>
      !store.deletedIds.includes(user.id) &&
      !dbIds.has(user.id) &&
      !dbMobiles.has(user.mobile.replace(/\D/g, "").slice(-10)),
  );

  const extras = store.extras.filter(
    (user) =>
      !store.deletedIds.includes(user.id) &&
      !dbIds.has(user.id) &&
      !dbMobiles.has(user.mobile.replace(/\D/g, "").slice(-10)) &&
      !fromOrders.some((row) => row.id === user.id),
  );

  return [...dbRows, ...fromOrders, ...extras].map((user) => ({
    ...user,
    ...store.overrides[user.id],
  }));
}

/** Sync local cache — prefer fetchAdminUsers() for admin UI. */
export function getAdminUsers(): AdminUserRecord[] {
  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  return assignSrNos(sortAdminUsers(mergeAdminUserRows([], store)));
}

/** Load users from Supabase + order-only rows; re-number newest as highest No. */
export async function fetchAdminUsers(): Promise<AdminUserRecord[]> {
  await fetchOrders();
  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  const res = await apiFetch<UserDto[]>("/api/users");

  const dbRows =
    res.ok && Array.isArray(res.data)
      ? res.data
          .map(userDtoToAdmin)
          .filter((u) => !store.deletedIds.includes(u.id))
          .map((u) => ({ ...u, ...store.overrides[u.id] }))
      : [];

  if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) {
    return getAdminUsers();
  }

  return assignSrNos(sortAdminUsers(mergeAdminUserRows(dbRows, store)));
}

export async function addAdminUser(
  user: Omit<AdminUserRecord, "id"> & { id?: string },
): Promise<AdminUserRecord | string> {
  const res = await apiFetch<UserDto>("/api/users", {
    method: "POST",
    body: JSON.stringify({
      firstName: user.firstName,
      lastName: user.lastName,
      mobile: user.mobile,
      email: user.email || null,
    }),
  });

  if (!res.ok || !res.data) {
    const message = formatAdminUserErrorMessage(res.error);
    showAdminToast(message, "error");
    return message;
  }

  const created: AdminUserRecord = {
    ...userDtoToAdmin(res.data),
    srNo: user.srNo,
  };

  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  store.deletedIds = store.deletedIds.filter((item) => item !== created.id);
  store.extras = [
    created,
    ...store.extras.filter((item) => item.id !== created.id),
  ];
  writeJson(USERS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));
  showAdminToast("User added successfully");
  return created;
}

export type AdminProvisionInput = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  businessName?: string;
  jobTitle?: string;
  logoDataUrl?: string;
};

function orderDtoToLocalOrder(dto: OrderDto): HexaOrder {
  return {
    id: dto.id,
    orderId: dto.orderId,
    createdAt: dto.createdAt,
    status: dto.status,
    paymentStatus: dto.paymentStatus,
    ownerPhone: dto.ownerPhone.replace(/\D/g, "").slice(-10),
    customerName: dto.customerName,
    phone: dto.phone.replace(/\D/g, "").slice(-10),
    email: dto.email,
    address: dto.address,
    city: dto.city,
    state: dto.state,
    postalCode: dto.postalCode,
    country: dto.country,
    countryId: dto.countryId,
    stateId: dto.stateId,
    cityId: dto.cityId,
    packTitle: dto.packTitle,
    qty: dto.qty,
    subtotal: dto.subtotal,
    discount: dto.discount,
    total: dto.total,
    coupon: dto.coupon,
    productTitle: dto.productTitle,
    productId: dto.productId ?? undefined,
    userId: dto.userId,
    cardId: dto.cardId,
    cardSlug: dto.cardSlug ?? undefined,
    cardUrl: dto.cardUrl ?? undefined,
    companyName: dto.companyName,
    jobTitle: dto.jobTitle,
    businessName: dto.businessName,
    reviewLink: dto.reviewLink ?? undefined,
    orderLogoSrc: dto.orderLogoSrc ?? undefined,
    cardDesign: dto.cardDesign ?? undefined,
    cardHidden: dto.cardHidden,
  };
}

/** Create user + Digital Profile + QR card (Super Admin). */
export async function provisionAdminUserWithCard(
  input: AdminProvisionInput,
): Promise<(AdminUserRecord & { liveUrl: string; cardSlug: string }) | string> {
  const res = await apiFetch<{
    user: UserDto;
    order: OrderDto;
    card: CardDto;
    slug: string;
    liveUrl: string;
  }>("/api/users/admin-provision", {
    method: "POST",
    body: JSON.stringify({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      mobile: input.mobile,
      businessName: input.businessName,
      jobTitle: input.jobTitle,
      logoDataUrl: input.logoDataUrl,
    }),
  });

  if (!res.ok || !res.data?.user) {
    const message = formatAdminUserErrorMessage(res.error);
    showAdminToast(message, "error");
    return message;
  }

  const created: AdminUserRecord = userDtoToAdmin(res.data.user);

  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  store.deletedIds = store.deletedIds.filter((item) => item !== created.id);
  store.extras = [
    created,
    ...store.extras.filter((item) => item.id !== created.id),
  ];
  writeJson(USERS_KEY, store);

  if (res.data.order) {
    const localOrder = orderDtoToLocalOrder(res.data.order);
    prependOrderToLocalCache(localOrder);
    if (res.data.card) {
      cacheProvisionedAdminCard(
        cardDtoToAdmin(res.data.card),
        localOrder.id,
      );
    }
    void initOrderCardProfileAsync(localOrder).catch((err) => {
      console.warn("[admin-provision] profile init failed:", err);
    });
  }

  window.dispatchEvent(new Event("hexa-admin-directory-change"));
  window.dispatchEvent(new Event("hexa-orders-change"));
  window.dispatchEvent(new Event("hexa-admin-cards-change"));
  showAdminToast(
    `User added with Digital Profile + QR · ${res.data.liveUrl}`,
  );

  return {
    ...created,
    liveUrl: res.data.liveUrl,
    cardSlug: res.data.slug,
  };
}

export async function updateAdminUser(
  id: string,
  patch: Partial<AdminUserRecord>,
): Promise<string | null> {
  const dbId = id.startsWith("db-") ? Number(id.slice(3)) : null;
  if (dbId && Number.isInteger(dbId) && dbId > 0) {
    const res = await apiFetch<UserDto>(`/api/users/${dbId}`, {
      method: "PATCH",
      body: JSON.stringify({
        firstName: patch.firstName,
        lastName: patch.lastName,
        email: patch.email,
        mobile: patch.mobile,
        status: patch.active === undefined ? undefined : patch.active ? 1 : 0,
      }),
    });

    if (!res.ok) {
      const message = formatAdminUserErrorMessage(res.error);
      showAdminToast(message, "error");
      return message;
    }
  }

  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  store.overrides[id] = { ...store.overrides[id], ...patch };
  store.extras = store.extras.map((user) =>
    user.id === id ? { ...user, ...patch } : user,
  );
  writeJson(USERS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));
  showAdminToast("User updated successfully");
  return null;
}

export function deleteAdminUser(id: string): Promise<boolean> {
  const store = readJson<UsersStore>(USERS_KEY, emptyUsersStore());
  if (!store.deletedIds.includes(id)) store.deletedIds.push(id);
  store.extras = store.extras.filter((user) => user.id !== id);
  delete store.overrides[id];
  writeJson(USERS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));

  return apiFetch<{
    hiddenOrderCodes?: string[];
    deletedCardIds?: number[];
  }>("/api/users/admin-delete", {
    method: "POST",
    body: JSON.stringify({ adminId: id }),
  }).then((res) => {
    if (!res.ok) {
      console.error("[admin-users] delete failed:", res.error);
      return false;
    }

    const cardsStore = readCardsStore();
    for (const orderCode of res.data?.hiddenOrderCodes ?? []) {
      removeOrderCardProfile(orderCode);
      if (!cardsStore.deletedIds.includes(orderCode)) {
        cardsStore.deletedIds.push(orderCode);
      }
    }
    for (const cardId of res.data?.deletedCardIds ?? []) {
      const cardKey = `card-${cardId}`;
      if (!cardsStore.deletedIds.includes(cardKey)) {
        cardsStore.deletedIds.push(cardKey);
      }
      cardsStore.extras = cardsStore.extras.filter((row) => row.id !== cardKey);
    }
    writeJson(CARDS_KEY, cardsStore);

    applyHiddenOrdersToLocalCache(res.data?.hiddenOrderCodes ?? []);
    window.dispatchEvent(new Event("hexa-admin-directory-change"));
    window.dispatchEvent(new Event("hexa-orders-change"));
    window.dispatchEvent(new Event("hexa-admin-cards-change"));
    return true;
  });
}

export function toggleAdminUser(id: string, active: boolean) {
  updateAdminUser(id, { active });
}

/** Sync local cache — prefer fetchAdminCards() for admin UI. */
export function getAdminCards(): AdminCardRecord[] {
  const store = readCardsStore();
  const orders = getOrders()
    .filter(isCardProductOrder)
    .filter((o) => !isOrderDashboardHidden(o));
  const orderRows = orders
    .filter((order) => !store.deletedIds.includes(order.id))
    .map((order) => {
      const card = orderToDashboardCard(order, false);
      const override = store.overrides[order.id] ?? {};
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
        startDate: override.startDate || formatShortDateDashed(order.createdAt),
        expiryDate: override.expiryDate || orderExpiryDate(order),
        pageViews: override.pageViews ?? 0,
        editHref: `/super-admin?tab=cards`,
        active: override.active ?? true,
      } satisfies AdminCardRecord;
    });

  const cachedExtras = store.extras.filter(
    (c) => !store.deletedIds.includes(c.id),
  );

  return assignSrNos(
    mergeAdminCards([], [...orderRows, ...cachedExtras]).map((c) => ({
      ...c,
      ...store.overrides[c.id],
    })),
  );
}

function sortAdminCards(rows: AdminCardRecord[]): AdminCardRecord[] {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a.startDate.replace(/-/g, " ")).getTime();
    const bTime = new Date(b.startDate.replace(/-/g, " ")).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return slugFromLiveUrl(a.liveUrl).localeCompare(
      slugFromLiveUrl(b.liveUrl),
    );
  });
}

/** Backfill missing cards in DB from orders — run manually, not on every list load. */
export async function syncAdminCardsFromOrders(): Promise<{
  synced: number;
  linked: number;
  totalCards: number;
} | null> {
  const res = await apiFetch<{
    synced: number;
    linked: number;
    totalCards: number;
  }>("/api/cards/sync-from-orders", { method: "POST" });
  if (!res.ok) {
    console.error("[admin-cards] sync failed:", res.error);
    return null;
  }
  return res.data ?? null;
}

/** Load cards from Supabase + orders (read-only merge, stable list). */
export async function fetchAdminCards(): Promise<AdminCardRecord[]> {
  let store = readCardsStore();

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

  if (cardsRes.ok && dbRows.length > 0 && store.extras.length > 0) {
    const dbIds = new Set(dbRows.map((row) => row.id));
    const prunedExtras = store.extras.filter((row) => !dbIds.has(row.id));
    if (prunedExtras.length !== store.extras.length) {
      store = { ...store, extras: prunedExtras };
      writeJson(CARDS_KEY, store);
    }
  }

  const cachedExtras = store.extras.filter(
    (c) => !store.deletedIds.includes(c.id),
  );

  const dbSlugs = new Set(
    dbRows.map((row) => slugFromLiveUrl(row.liveUrl)).filter(Boolean),
  );
  const dbCardIds = new Set(
    dbRows
      .map((row) => adminCardIdNumeric(row.id))
      .filter((id): id is number => id != null),
  );

  const orderRows = orders
    .filter(isCardProductOrder)
    .filter((o) => {
      const dbId = o.cardId && o.cardId > 0 ? `card-${o.cardId}` : null;
      return (
        !store.deletedIds.includes(o.id) &&
        (!dbId || !store.deletedIds.includes(dbId))
      );
    })
    .filter((o) => {
      if (o.cardId && o.cardId > 0 && dbCardIds.has(o.cardId)) return false;
      const slug = resolveOrderLiveUrl(o).slug.toLowerCase();
      return slug ? !dbSlugs.has(slug) : true;
    })
    .map(orderToAdminCard);

  const merged = mergeAdminCards(dbRows, [...orderRows, ...cachedExtras]).map(
    (c) => ({
      ...c,
      ...store.overrides[c.id],
    }),
  );

  return assignSrNos(sortAdminCards(merged));
}

export function updateAdminCard(id: string, patch: Partial<AdminCardRecord>) {
  const store = readCardsStore();
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

export function deleteAdminCard(id: string): Promise<boolean> {
  const store = readCardsStore();
  if (!store.deletedIds.includes(id)) store.deletedIds.push(id);
  store.extras = store.extras.filter((row) => row.id !== id);
  delete store.overrides[id];
  writeJson(CARDS_KEY, store);
  window.dispatchEvent(new Event("hexa-admin-directory-change"));
  window.dispatchEvent(new Event("hexa-admin-cards-change"));

  return apiFetch<{
    deletedCardId?: number | null;
    hiddenOrderCodes?: string[];
  }>("/api/cards/admin-delete", {
    method: "POST",
    body: JSON.stringify({ adminId: id }),
  }).then((res) => {
    if (!res.ok) {
      console.error("[admin-cards] delete failed:", res.error);
      return false;
    }

    const cardsStore = readCardsStore();
    for (const orderCode of res.data?.hiddenOrderCodes ?? []) {
      removeOrderCardProfile(orderCode);
      if (!cardsStore.deletedIds.includes(orderCode)) {
        cardsStore.deletedIds.push(orderCode);
      }
    }
    if (res.data?.deletedCardId) {
      const cardKey = `card-${res.data.deletedCardId}`;
      if (!cardsStore.deletedIds.includes(cardKey)) {
        cardsStore.deletedIds.push(cardKey);
      }
    }
    writeJson(CARDS_KEY, cardsStore);

    applyHiddenOrdersToLocalCache(res.data?.hiddenOrderCodes ?? []);
    window.dispatchEvent(new Event("hexa-admin-directory-change"));
    window.dispatchEvent(new Event("hexa-orders-change"));
    return true;
  });
}

export function toggleAdminCard(id: string, active: boolean) {
  updateAdminCard(id, { active });
}
