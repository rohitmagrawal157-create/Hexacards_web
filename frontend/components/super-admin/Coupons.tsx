"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  TicketPercent,
  Copy,
  Check,
} from "lucide-react";
import {
  createCoupon,
  deleteCoupon,
  fetchCoupons,
  generateCouponCode,
  updateCoupon,
  type AdminCoupon,
} from "@/lib/coupons-api";
import { showAdminToast } from "@/lib/admin-toast";

type CouponDraft = {
  name: string;
  code: string;
  percentOff: string;
  active: boolean;
};

const emptyDraft = (): CouponDraft => ({
  name: "",
  code: "",
  percentOff: "10",
  active: true,
});

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CouponsPanel() {
  const [rows, setRows] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCoupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function loadCoupons() {
    setLoading(true);
    try {
      const next = await fetchCoupons();
      setRows(next);
    } catch (err) {
      showAdminToast(
        err instanceof Error ? err.message : "Failed to load coupons",
        "error",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoupons();
  }, []);

  const stats = useMemo(() => {
    const active = rows.filter((c) => c.active).length;
    return { total: rows.length, active, inactive: rows.length - active };
  }, [rows]);

  function openAdd() {
    setEditingId(null);
    setDraft({
      ...emptyDraft(),
      code: generateCouponCode("HEXA"),
    });
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(coupon: AdminCoupon) {
    setEditingId(coupon.id);
    setDraft({
      name: coupon.name,
      code: coupon.code,
      percentOff: String(coupon.percentOff),
      active: coupon.active,
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

  function onNameChange(name: string) {
    setDraft((d) => {
      const next = { ...d, name };
      // Auto-generate code for new coupons when name changes (keep manual edits if user typed code first only on add)
      if (!editingId) {
        next.code = generateCouponCode(name || "HEXA");
      }
      return next;
    });
  }

  function regenerateCode() {
    setDraft((d) => ({
      ...d,
      code: generateCouponCode(d.name || "HEXA"),
    }));
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 1600);
    } catch {
      showAdminToast("Could not copy code", "error");
    }
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    const code = draft.code.trim().toUpperCase();
    const percentOff = Number(draft.percentOff);

    if (!name) {
      setFormError("Coupon name is required.");
      return;
    }
    if (!code || code.length < 4) {
      setFormError("Coupon code must be at least 4 characters.");
      return;
    }
    if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
      setFormError("Enter a percentage between 1 and 100.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      if (editingId) {
        await updateCoupon(editingId, {
          name,
          code,
          percentOff,
          active: draft.active,
        });
        showAdminToast("Coupon updated");
      } else {
        await createCoupon({
          name,
          code,
          percentOff,
          active: draft.active,
        });
        showAdminToast("Coupon created");
      }
      closeForm();
      await loadCoupons();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save coupon");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(coupon: AdminCoupon) {
    try {
      const next = await updateCoupon(coupon.id, { active: !coupon.active });
      setRows((prev) =>
        prev.map((row) => (row.id === coupon.id ? next : row)),
      );
    } catch (err) {
      showAdminToast(
        err instanceof Error ? err.message : "Could not update status",
        "error",
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await deleteCoupon(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      showAdminToast("Coupon deleted");
    } catch (err) {
      showAdminToast(
        err instanceof Error ? err.message : "Could not delete coupon",
        "error",
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-[#5c5346]">
          Create discount coupons with an auto-generated code. Customers enter
          the code at checkout to get a percentage off.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadCoupons()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
          >
            <RefreshCw className="h-4 w-4 text-[#BC7C10]" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#BC7C10] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#9a650d]"
          >
            <Plus className="h-4 w-4" />
            Add coupon
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total coupons", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Inactive", value: stats.inactive },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
              {stat.label}
            </p>
            <p className="font-dashboard mt-1 text-2xl font-bold text-[#141414]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-[11px] font-bold tracking-wide text-[#8a8174] uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Created</th>
                <th className="w-[88px] px-4 py-3">Status</th>
                <th className="w-[96px] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-[#8a8174]"
                  >
                    Loading coupons…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[#8a8174]"
                  >
                    <TicketPercent className="mx-auto mb-2 h-8 w-8 text-[#BC7C10]/70" />
                    No coupons yet. Add your first discount code.
                  </td>
                </tr>
              ) : (
                rows.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className="border-b border-black/[0.04] align-middle last:border-0"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#141414]">{coupon.name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => void copyCode(coupon.code)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-[#FFFCF7] px-2.5 py-1.5 font-mono text-xs font-semibold tracking-wide text-[#141414] transition-colors hover:border-[#BC7C10]/35"
                        title="Copy code"
                      >
                        {coupon.code}
                        {copiedCode === coupon.code ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-[#BC7C10]" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-md bg-[#FFF8ED] px-2 py-1 text-xs font-bold text-[#9a650d]">
                        {coupon.percentOff}% off
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-[#5c5346]">
                      {formatDate(coupon.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={coupon.active}
                          onChange={() => void handleToggle(coupon)}
                          className="peer sr-only"
                          aria-label={`Toggle ${coupon.name}`}
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(coupon)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-[#5c5346] transition-colors hover:bg-black/[0.03]"
                          aria-label={`Edit ${coupon.name}`}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(coupon)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E24C4C]/25 bg-white text-[#E24C4C] transition-colors hover:bg-[#E24C4C]/5"
                          aria-label={`Delete ${coupon.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="absolute inset-0" onClick={closeForm} aria-hidden />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                  {editingId ? "Edit coupon" : "New coupon"}
                </p>
                <h2 className="font-dashboard text-lg font-bold text-[#141414]">
                  {editingId ? "Update discount" : "Create discount"}
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
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Coupon name
                </label>
                <input
                  value={draft.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="e.g. Welcome offer"
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[#5c5346]">
                    Coupon code
                  </label>
                  <button
                    type="button"
                    onClick={regenerateCode}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#BC7C10] hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Auto generate
                  </button>
                </div>
                <input
                  value={draft.code}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32),
                    }))
                  }
                  placeholder="AUTO-GENERATED"
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 font-mono text-sm tracking-wide uppercase focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-[#8a8174]">
                  Generated from the name. You can regenerate or edit manually.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Discount percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={draft.percentOff}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, percentOff: e.target.value }))
                    }
                    placeholder="10"
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] py-2.5 pr-10 pl-3 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-semibold text-[#8a8174]">
                    %
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-[#FFFCF7] px-3 py-3">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, active: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-black/20 text-[#BC7C10] focus:ring-[#BC7C10]"
                />
                <span className="text-sm font-medium text-[#141414]">
                  Active — usable at checkout
                </span>
              </label>

              {formError ? (
                <p className="rounded-lg bg-[#E24C4C]/10 px-3 py-2 text-sm text-[#E24C4C]">
                  {formError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#5c5346] hover:bg-black/[0.03] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#BC7C10] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9a650d] disabled:cursor-wait disabled:opacity-70"
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Create coupon"}
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
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-xl">
            <div className="border-b border-black/[0.06] px-5 py-4">
              <p className="text-[10px] font-bold tracking-[0.14em] text-[#E24C4C] uppercase">
                Delete coupon
              </p>
              <h3 className="font-dashboard mt-1 text-lg font-bold text-[#141414]">
                Remove {deleteTarget.code}?
              </h3>
            </div>
            <p className="px-5 py-4 text-sm text-[#5c5346]">
              Customers will no longer be able to use this code at checkout.
            </p>
            <div className="flex justify-end gap-2 border-t border-black/[0.06] px-5 py-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-black/[0.08] px-4 py-2.5 text-sm font-semibold text-[#141414] hover:bg-black/[0.03]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="rounded-xl bg-[#E24C4C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#c93d3d]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
