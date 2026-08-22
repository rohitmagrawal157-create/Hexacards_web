"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  LogIn,
  Pencil,
  FileDown,
  Printer,
  Plus,
  X,
  CalendarDays,
} from "lucide-react";
import {
  addAdminUser,
  deleteAdminUser,
  getAdminUsers,
  toggleAdminUser,
  updateAdminUser,
} from "@/lib/admin-directory";
import { setAuthUser } from "@/lib/auth";

export type AdminUserRow = {
  id: string;
  srNo: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  regDate: string;
  active: boolean;
};

type UserDraft = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
};

const emptyDraft = (): UserDraft => ({
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
});

function fullName(user: Pick<AdminUserRow, "firstName" | "lastName">) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
}

function formatRegDate(date = new Date()) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ /g, "-");
}

function parseRegDate(value: string): Date | null {
  const parsed = new Date(value.replace(/-/g, " "));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinRegDateRange(
  regDate: string,
  from: string,
  to: string,
): boolean {
  const date = parseRegDate(regDate);
  if (!date) return !from && !to;

  if (from) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    if (date < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (date > toDate) return false;
  }

  return true;
}

function formatInputDateLabel(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PAGE_SIZE = 10;

function toCsv(rows: AdminUserRow[]): string {
  const headers = [
    "Sr. No.",
    "First Name",
    "Last Name",
    "Email",
    "Mobile",
    "Reg Date",
    "Status",
  ];
  const lines = rows.map((r) =>
    [
      r.srNo,
      `"${r.firstName.replace(/"/g, '""')}"`,
      `"${r.lastName.replace(/"/g, '""')}"`,
      r.email,
      r.mobile,
      r.regDate,
      r.active ? "Active" : "Inactive",
    ].join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printTable(rows: AdminUserRow[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td>${r.srNo}</td><td>${r.firstName}</td><td>${r.lastName}</td><td>${r.email}</td><td>${r.mobile}</td><td>${r.regDate}</td><td>${r.active ? "Active" : "Inactive"}</td></tr>`,
    )
    .join("");
  win.document.write(`
    <html>
      <head>
        <title>All Users — HexaCards</title>
        <style>
          body { font-family: system-ui, sans-serif; color: #141414; padding: 24px; }
          h2 { margin: 0 0 16px; }
          table { border-collapse: collapse; width: 100%; font-size: 13px; }
          th, td { border: 1px solid #e5e5e5; padding: 8px 10px; text-align: left; }
          th { background: #FFF8ED; color: #9a650d; }
        </style>
      </head>
      <body>
        <h2>All Users</h2>
        <table>
          <thead><tr><th>Sr. No.</th><th>First Name</th><th>Last Name</th><th>Email</th><th>Mobile</th><th>Reg Date</th><th>Status</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.print();
}

function validateDraft(draft: UserDraft): string | null {
  if (!draft.firstName.trim()) return "First name is required.";
  if (!draft.lastName.trim()) return "Last name is required.";
  if (!draft.mobile.trim()) return "Mobile number is required.";
  if (!/^\d{10}$/.test(draft.mobile.trim())) {
    return "Enter a valid 10-digit mobile number.";
  }
  if (!draft.email.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    return "Enter a valid email address.";
  }
  return null;
}

export default function UsersPanel({
  users,
  onLoginAsUser,
  onDeleteUser,
  onToggleStatus,
  onAddUser,
  onUpdateUser,
}: {
  users?: AdminUserRow[];
  onLoginAsUser?: (id: string) => void;
  onDeleteUser?: (id: string) => void;
  onToggleStatus?: (id: string, active: boolean) => void;
  onAddUser?: (user: AdminUserRow) => void;
  onUpdateUser?: (user: AdminUserRow) => void;
}) {
  const [rows, setRows] = useState<AdminUserRow[]>(() => users ?? getAdminUsers());
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserDraft>(emptyDraft());
  const [formError, setFormError] = useState("");

  useEffect(() => {
    function sync() {
      setRows(getAdminUsers());
    }
    sync();
    window.addEventListener("hexa-orders-change", sync);
    window.addEventListener("hexa-admin-directory-change", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("hexa-orders-change", sync);
      window.removeEventListener("hexa-admin-directory-change", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;

    if (q) {
      list = list.filter((u) =>
        [fullName(u), u.email, u.mobile].join(" ").toLowerCase().includes(q),
      );
    }

    if (dateFrom || dateTo) {
      list = list.filter((u) => isWithinRegDateRange(u.regDate, dateFrom, dateTo));
    }

    list = [...list].sort((a, b) =>
      sortAsc ? a.srNo - b.srNo : b.srNo - a.srNo,
    );

    return list;
  }, [rows, search, dateFrom, dateTo, sortAsc]);

  const hasDateFilter = Boolean(dateFrom || dateTo);
  const filteredActiveCount = filtered.filter((u) => u.active).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const editingUser = editingId
    ? rows.find((u) => u.id === editingId) ?? null
    : null;

  function openAddUser() {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormError("");
    setFormOpen(true);
  }

  function openEditUser(user: AdminUserRow) {
    setEditingId(user.id);
    setDraft({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
    });
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft());
    setFormError("");
  }

  function saveForm(e: React.FormEvent) {
    e.preventDefault();
    const error = validateDraft(draft);
    if (error) {
      setFormError(error);
      return;
    }

    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();
    const email = draft.email.trim().toLowerCase();
    const mobile = draft.mobile.trim();

    if (editingId) {
      const updated = rows.map((u) =>
        u.id === editingId
          ? { ...u, firstName, lastName, email, mobile }
          : u,
      );
      const next = updated.find((u) => u.id === editingId);
      setRows(updated);
      if (next) {
        updateAdminUser(next.id, next);
        onUpdateUser?.(next);
      }
    } else {
      const nextSr =
        rows.reduce((max, u) => Math.max(max, u.srNo), 0) + 1;
      const created: AdminUserRow = {
        id: `u-${Date.now().toString(36)}`,
        srNo: nextSr,
        firstName,
        lastName,
        email,
        mobile,
        regDate: formatRegDate(),
        active: true,
      };
      setRows((prev) => [created, ...prev]);
      addAdminUser(created);
      onAddUser?.(created);
      setPage(1);
    }

    closeForm();
  }

  function handleLogin(id: string) {
    const user = rows.find((row) => row.id === id);
    if (!user) return;

    if (onLoginAsUser) {
      onLoginAsUser(id);
      return;
    }

    const phone = user.mobile.replace(/\D/g, "").slice(-10);
    if (!phone) {
      window.alert("This user has no mobile number, so the dashboard cannot be opened.");
      return;
    }

    setAuthUser(phone, fullName(user) || "User");
    const dashboard = window.open("/dashboard", "_blank", "noopener,noreferrer");
    if (!dashboard) {
      // window.alert("Please allow pop-ups to open this user’s dashboard in a new tab.");
    }
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((u) => u.id !== id));
    setDeleteTarget(null);
    deleteAdminUser(id);
    onDeleteUser?.(id);
  }

  function handleToggle(id: string, next: boolean) {
    setRows((prev) =>
      prev.map((u) => (u.id === id ? { ...u, active: next } : u)),
    );
    toggleAdminUser(id, next);
    onToggleStatus?.(id, next);
  }

  function clearDateFilter() {
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={openAddUser}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#BC7C10] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#9a650d]"
        >
          <Plus className="h-4 w-4" />
          Add user
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            {hasDateFilter || search.trim() ? "Matching users" : "Total users"}
          </p>
          <p className="font-dashboard mt-1 text-2xl font-bold text-[#141414]">
            {filtered.length}
          </p>
          {hasDateFilter || search.trim() ? (
            <p className="mt-1 text-xs text-[#8a8174]">
              of {rows.length} total
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            Active
          </p>
          <p className="font-dashboard mt-1 text-2xl font-bold text-[#141414]">
            {filteredActiveCount}
          </p>
        </div>
        <div className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            Inactive
          </p>
          <p className="font-dashboard mt-1 text-2xl font-bold text-[#141414]">
            {filtered.length - filteredActiveCount}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => printTable(filtered)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
            >
              <FileDown className="h-3.5 w-3.5 text-[#BC7C10]" />
              PDF
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  toCsv(filtered),
                  "users.xls",
                  "application/vnd.ms-excel",
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
            >
              <FileDown className="h-3.5 w-3.5 text-[#BC7C10]" />
              Excel
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(toCsv(filtered), "users.csv", "text/csv")
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
            >
              <FileDown className="h-3.5 w-3.5 text-[#BC7C10]" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => printTable(filtered)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
            >
              <Printer className="h-3.5 w-3.5 text-[#BC7C10]" />
              Print
            </button>
          </div>

          <div className="flex w-full flex-wrap items-end justify-end gap-3 lg:w-auto">
            <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
              <label className="block min-w-[140px] flex-1 sm:flex-none">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#5c5346]">
                  <CalendarDays className="h-3.5 w-3.5 text-[#BC7C10]" />
                  From
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm text-[#141414] focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </label>
              <label className="block min-w-[140px] flex-1 sm:flex-none">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#5c5346]">
                  <CalendarDays className="h-3.5 w-3.5 text-[#BC7C10]" />
                  To
                </span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm text-[#141414] focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </label>
              {hasDateFilter ? (
                <button
                  type="button"
                  onClick={clearDateFilter}
                  className="rounded-xl border border-black/[0.08] px-3 py-2.5 text-xs font-semibold text-[#5c5346] transition-colors hover:bg-black/[0.03]"
                >
                  Clear dates
                </button>
              ) : null}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8a8174]" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, mobile…"
                className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] py-2.5 pr-3 pl-9 text-sm text-[#141414] placeholder:text-[#8a8174]/70 focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {hasDateFilter ? (
          <div className="border-b border-black/[0.06] bg-[#FFFCF7]/70 px-5 py-2.5 text-xs text-[#5c5346]">
            Showing users registered
            {dateFrom && dateTo
              ? ` from ${formatInputDateLabel(dateFrom)} to ${formatInputDateLabel(dateTo)}`
              : dateFrom
                ? ` from ${formatInputDateLabel(dateFrom)} onwards`
                : ` up to ${formatInputDateLabel(dateTo)}`}
            {" · "}
            <span className="font-semibold text-[#141414]">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "user" : "users"} found
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-[11px] font-bold tracking-wide text-[#8a8174] uppercase">
                <th className="w-[72px] px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSortAsc((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-[#141414]"
                  >
                    No.
                    {sortAsc ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </th>
                <th className="min-w-[180px] px-4 py-3">Name</th>
                <th className="min-w-[200px] px-4 py-3">Email</th>
                <th className="min-w-[110px] px-4 py-3">Mobile</th>
                <th className="min-w-[100px] px-4 py-3">Reg date</th>
                <th className="w-[80px] px-4 py-3">Status</th>
                <th className="w-[88px] px-4 py-3">Login</th>
                <th className="w-[96px] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-black/[0.04] align-top last:border-0"
                >
                  <td className="px-4 py-4 font-semibold tabular-nums text-[#8a8174]">
                    {user.srNo}
                  </td>
                  <td className="px-4 py-4">
                    <span className="break-words leading-snug font-medium text-[#141414]">
                      {fullName(user)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="block break-all leading-snug text-[#5c5346]">
                      {user.email}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap tabular-nums text-[#5c5346]">
                    {user.mobile}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-[#5c5346]">
                    {user.regDate}
                  </td>
                  <td className="px-4 py-3">
                    <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={user.active}
                        onChange={(e) =>
                          handleToggle(user.id, e.target.checked)
                        }
                        className="peer sr-only"
                        aria-label={`Toggle status for ${fullName(user)}`}
                      />
                      <span
                        className="absolute inset-0 rounded-full bg-black/15 transition-colors peer-checked:bg-[#BC7C10]"
                        aria-hidden
                      />
                      <span
                        className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
                        aria-hidden
                      />
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleLogin(user.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
                    >
                      <LogIn className="h-3.5 w-3.5 text-[#BC7C10]" />
                      Login
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditUser(user)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-[#5c5346] transition-colors hover:bg-black/[0.03]"
                        aria-label={`Edit ${fullName(user)}`}
                        title="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(user)}
                        aria-label={`Delete ${fullName(user)}`}
                        title="Delete"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E24C4C]/25 bg-white text-[#E24C4C] transition-colors hover:bg-[#E24C4C]/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-[#8a8174]"
                  >
                    {hasDateFilter || search.trim()
                      ? "No users found for the selected filters."
                      : "No users found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-5 py-4 text-sm text-[#5c5346]">
          <p>
            Showing{" "}
            <span className="font-semibold text-[#141414]">
              {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-[#141414]">
              {Math.min(safePage * PAGE_SIZE, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[#141414]">
              {filtered.length}
            </span>{" "}
            users
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i + 1)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  safePage === i + 1
                    ? "bg-[#BC7C10] text-white"
                    : "border border-black/[0.08] text-[#141414] hover:bg-black/[0.03]"
                }`}
              >
                {i + 1}
              </button>
            ))}
            {totalPages > 5 ? (
              <span className="px-1 text-[#8a8174]">…</span>
            ) : null}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={closeForm}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                  {editingId ? "Edit user" : "New user"}
                </p>
                <h2 className="font-dashboard text-lg font-bold text-[#141414]">
                  {editingId
                    ? editingUser
                      ? fullName(editingUser)
                      : "Update user"
                    : "Add user"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/[0.04]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveForm} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    First name
                  </label>
                  <input
                    value={draft.firstName}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, firstName: e.target.value }))
                    }
                    placeholder="First name"
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    Last name
                  </label>
                  <input
                    value={draft.lastName}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, lastName: e.target.value }))
                    }
                    placeholder="Last name"
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Mobile
                </label>
                <input
                  value={draft.mobile}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Email
                </label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, email: e.target.value }))
                  }
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>

              {formError ? (
                <p className="rounded-lg bg-[#E24C4C]/10 px-3 py-2 text-sm text-[#E24C4C]">
                  {formError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#5c5346] hover:bg-black/[0.03]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#BC7C10] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9a650d]"
                >
                  {editingId ? "Save changes" : "Add user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="absolute inset-0"
            onClick={() => setDeleteTarget(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-xl"
          >
            <div className="border-b border-black/[0.06] px-5 py-4">
              <p className="text-[10px] font-bold tracking-[0.14em] text-[#E24C4C] uppercase">
                Delete user
              </p>
              <h3
                id="delete-user-title"
                className="font-dashboard mt-1 text-lg font-bold text-[#141414]"
              >
                Are you sure?
              </h3>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-[#5c5346]">
              <p>
                Do you want to delete{" "}
                <span className="font-semibold text-[#141414]">
                  {fullName(deleteTarget)}
                </span>
                ?
              </p>
              <p className="text-xs text-[#8a8174]">
                This will permanently remove the user and cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] px-5 py-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-black/[0.08] px-4 py-2.5 text-sm font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget.id)}
                className="rounded-xl bg-[#E24C4C] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#c93d3d]"
              >
                Delete user
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
