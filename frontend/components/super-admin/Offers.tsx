"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ExternalLink,
  ImagePlus,
  Link2,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  createHomeOffer,
  deleteHomeOffer,
  fetchHomeOffers,
  updateHomeOffer,
  OFFER_PAGE_OPTIONS,
  labelForPageTarget,
  normalizePageTarget,
  type HomeOffer,
  type OfferPageTarget,
} from "@/lib/offers-api";
import { showAdminToast } from "@/lib/admin-toast";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PAGE_PATH_LEN = 512;

type OfferDraft = {
  title: string;
  linkUrl: string;
  active: boolean;
  showOnPages: OfferPageTarget[];
  imagePreview: string;
  pendingDataUrl: string | null;
};

function emptyDraft(): OfferDraft {
  return {
    title: "New offer",
    linkUrl: "/products",
    active: true,
    showOnPages: ["/"],
    imagePreview: "/Images/ads.png",
    pendingDataUrl: null,
  };
}

function draftFromOffer(offer: HomeOffer): OfferDraft {
  return {
    title: offer.title,
    linkUrl: offer.linkUrl,
    active: offer.active,
    showOnPages: offer.showOnPages?.length ? [...offer.showOnPages] : ["/"],
    imagePreview: offer.imageUrl.startsWith("data:")
      ? "/Images/ads.png"
      : offer.imageUrl,
    pendingDataUrl: null,
  };
}

function sanitizePages(pages: OfferPageTarget[]): OfferPageTarget[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of pages) {
    const path = normalizePageTarget(raw);
    if (!path || path.length > MAX_PAGE_PATH_LEN || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

function togglePageTarget(
  pages: OfferPageTarget[],
  target: string,
): OfferPageTarget[] {
  const path = normalizePageTarget(target);
  if (!path) return pages;
  const set = new Set(sanitizePages(pages));
  if (set.has(path)) set.delete(path);
  else set.add(path);
  return Array.from(set);
}

export default function OffersPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<HomeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<OfferDraft>(emptyDraft());
  const [customPageInput, setCustomPageInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HomeOffer | null>(null);

  function addCustomPage() {
    const path = normalizePageTarget(customPageInput);
    if (!path) {
      showAdminToast("Paste a page path or full URL (e.g. /contact).", "error");
      return;
    }
    setDraft((d) => {
      const set = new Set(
        d.showOnPages.map((p) => normalizePageTarget(p)).filter(Boolean),
      );
      set.add(path);
      return { ...d, showOnPages: Array.from(set) };
    });
    setCustomPageInput("");
  }

  async function loadOffers(opts?: { silent?: boolean }) {
    const silent = Boolean(opts?.silent) && rows.length > 0;
    if (!silent) setLoading(true);
    try {
      const next = await fetchHomeOffers();
      setRows(next);
    } catch (err) {
      showAdminToast(
        err instanceof Error ? err.message : "Failed to load offers",
        "error",
      );
      if (!silent) setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setCustomPageInput("");
    setFormOpen(true);
  }

  function openEdit(offer: HomeOffer) {
    setEditingId(offer.id);
    setDraft(draftFromOffer(offer));
    setCustomPageInput("");
    setFormOpen(true);
  }

  function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showAdminToast("Use a PNG, JPG, or WebP image.", "error");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      showAdminToast("Image must be 5 MB or smaller.", "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        showAdminToast("Could not read that image.", "error");
        return;
      }
      setDraft((d) => ({
        ...d,
        pendingDataUrl: dataUrl,
        imagePreview: dataUrl,
      }));
    };
    reader.onerror = () => showAdminToast("Could not read that image.", "error");
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSave() {
    if (!draft.title.trim()) {
      showAdminToast("Offer title is required.", "error");
      return;
    }
    if (!draft.linkUrl.trim()) {
      showAdminToast("Click link is required.", "error");
      return;
    }
    const pages = sanitizePages(draft.showOnPages);
    if (!pages.length) {
      showAdminToast("Select at least one page to show this offer.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateHomeOffer(editingId, {
          title: draft.title.trim(),
          linkUrl: draft.linkUrl.trim(),
          active: draft.active,
          showOnPages: pages,
          ...(draft.pendingDataUrl
            ? { imageDataUrl: draft.pendingDataUrl }
            : {}),
        });
        setRows((prev) =>
          prev.map((row) => (row.id === updated.id ? updated : row)),
        );
        showAdminToast("Offer updated.", "success");
      } else {
        const created = await createHomeOffer({
          title: draft.title.trim(),
          linkUrl: draft.linkUrl.trim(),
          active: draft.active,
          showOnPages: pages,
          imageDataUrl: draft.pendingDataUrl || undefined,
          imageUrl:
            draft.pendingDataUrl || draft.imagePreview.startsWith("data:")
              ? undefined
              : draft.imagePreview,
        });
        setRows((prev) => [...prev, created]);
        showAdminToast("Offer created.", "success");
      }
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyDraft());
    } catch (err) {
      showAdminToast(
        err instanceof Error ? err.message : "Failed to save offer",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setSaving(true);
    try {
      await deleteHomeOffer(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      showAdminToast("Offer deleted.", "success");
      setDeleteTarget(null);
    } catch (err) {
      showAdminToast(
        err instanceof Error ? err.message : "Failed to delete offer",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(offer: HomeOffer) {
    const nextActive = !offer.active;
    setRows((prev) =>
      prev.map((row) =>
        row.id === offer.id ? { ...row, active: nextActive } : row,
      ),
    );
    try {
      const updated = await updateHomeOffer(offer.id, { active: nextActive });
      setRows((prev) =>
        prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
      );
      showAdminToast(
        nextActive ? "Offer dialog is open." : "Offer dialog is closed.",
        "success",
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((row) =>
          row.id === offer.id ? { ...row, active: offer.active } : row,
        ),
      );
      showAdminToast(
        err instanceof Error ? err.message : "Failed to update offer",
        "error",
      );
    }
  }

  const activeCount = rows.filter((r) => r.active).length;

  const pageOwner = new Map<string, HomeOffer[]>();
  for (const offer of rows) {
    if (!offer.active) continue;
    for (const raw of offer.showOnPages || []) {
      const path = normalizePageTarget(raw);
      if (!path) continue;
      const list = pageOwner.get(path) || [];
      list.push(offer);
      pageOwner.set(path, list);
    }
  }
  const overlappingPages = Array.from(pageOwner.entries())
    .filter(([, list]) => list.length > 1)
    .map(([path, list]) => ({
      path,
      titles: list.map((o) => o.title),
    }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            <Megaphone className="h-3.5 w-3.5" />
            Offer banners
          </p>
          <p className="mt-1 max-w-xl text-sm text-[#5c5346]">
            Each offer is one image → one click link. Pick preset pages or paste
            any site path/URL where the banner should appear. If two active
            offers share a page, the more specific / newest one is shown.
          </p>
          <p className="mt-1 text-xs text-[#8a8174]">
            {rows.length} total · {activeCount} open
          </p>
          {overlappingPages.length > 0 ? (
            <p className="mt-2 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900">
              Same page on multiple offers:{" "}
              {overlappingPages
                .map(
                  (o) =>
                    `${o.path} (${o.titles.map((t) => `“${t}”`).join(", ")})`,
                )
                .join(" · ")}
              . Visitors see the most specific / newest match.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadOffers({ silent: true })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#141414] transition hover:bg-[#FFFCF7]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#141414] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#2a2a2a]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add offer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-black/[0.06] bg-white p-8 text-center text-sm text-[#8a8174]">
          Loading offers…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/10 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-[#141414]">No offers yet</p>
          <p className="mt-1 text-xs text-[#8a8174]">
            Add an image and a link — visitors click the image to open that URL.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#BC7C10] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add first offer
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((offer) => (
            <article
              key={offer.id}
              className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <a
                href={offer.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative block bg-[#0b0b0b]"
                title={`Open ${offer.linkUrl}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={offer.imageUrl}
                  alt={offer.title}
                  className="mx-auto block h-auto max-h-[220px] w-full object-cover transition group-hover:opacity-95"
                />
                <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  <ExternalLink className="h-3 w-3" />
                  Open link
                </span>
              </a>

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#141414]">
                      {offer.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#8a8174]">
                      <Link2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{offer.linkUrl}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={offer.active}
                    onClick={() => void toggleActive(offer)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      offer.active ? "bg-[#22c55e]" : "bg-[#d4d0c8]"
                    }`}
                    title={offer.active ? "Dialog open" : "Dialog closed"}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                        offer.active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-[11px] font-semibold text-[#141414]">
                  Status:{" "}
                  <span
                    className={
                      offer.active ? "text-green-700" : "text-[#8a8174]"
                    }
                  >
                    {offer.active ? "Open" : "Closed"}
                  </span>
                </p>
                <p className="text-[11px] leading-snug text-[#8a8174]">
                  Shows on:{" "}
                  <span className="font-medium text-[#141414]">
                    {(offer.showOnPages?.length
                      ? offer.showOnPages
                      : ["/"]
                    )
                      .map(labelForPageTarget)
                      .join(", ")}
                  </span>
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(offer)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-[#141414] transition hover:bg-[#FFFCF7]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(offer)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#141414]/45"
            aria-label="Close form"
            onClick={() => !saving && setFormOpen(false)}
          />
          <div className="relative z-[1] max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[#141414]">
                {editingId ? "Edit offer" : "Add offer"}
              </h3>
              <button
                type="button"
                onClick={() => !saving && setFormOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-1 text-xs text-[#8a8174]">
              Upload an image and set the link visitors open when they click it
              (same behavior as the home screen dialog).
            </p>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
                  Title
                </span>
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, title: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3.5 py-2.5 text-sm outline-none focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15"
                  placeholder="Summer sale"
                />
              </label>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
                    Banner image
                  </span>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[#FFFCF7] px-3 py-1.5 text-xs font-semibold"
                  >
                    <ImagePlus className="h-3.5 w-3.5 text-[#BC7C10]" />
                    Upload
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    className="sr-only"
                    onChange={onPickImage}
                  />
                </div>
                <a
                  href={draft.linkUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="relative mt-2 block overflow-hidden rounded-xl bg-[#0b0b0b]"
                  title="Preview click → opens link"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draft.imagePreview}
                    alt="Offer preview"
                    className="mx-auto block h-auto max-h-[280px] w-full"
                  />
                </a>
                <p className="mt-1.5 text-[11px] text-[#8a8174]">
                  Click preview to test the link · PNG/JPG/WebP · max 5 MB
                </p>
              </div>

              <label className="block">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
                  <Link2 className="h-3.5 w-3.5" />
                  Click opens this link
                </span>
                <input
                  value={draft.linkUrl}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, linkUrl: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3.5 py-2.5 text-sm outline-none focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15"
                  placeholder="/products"
                />
              </label>

              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
                  Show banner on these pages
                </p>
                <p className="mt-1 text-[11px] text-[#8a8174]">
                  Same idea as the click link — use presets or paste any page
                  path / full URL (we store the path, e.g.{" "}
                  <span className="font-medium text-[#141414]">/contact</span>).
                </p>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {OFFER_PAGE_OPTIONS.map((page) => {
                    const checked = draft.showOnPages.some(
                      (p) => normalizePageTarget(p) === page.path,
                    );
                    return (
                      <label
                        key={page.id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                          checked
                            ? "border-[#BC7C10]/40 bg-[#FFF8ED]"
                            : "border-black/10 bg-[#FFFCF7]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setDraft((d) => ({
                              ...d,
                              showOnPages: togglePageTarget(
                                d.showOnPages,
                                page.path,
                              ),
                            }));
                          }}
                          className="h-4 w-4 rounded border-black/20 text-[#BC7C10] focus:ring-[#BC7C10]/30"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-[#141414]">
                            {page.label}
                          </span>
                          <span className="block truncate text-[11px] text-[#8a8174]">
                            {page.path}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
                    <Link2 className="h-3.5 w-3.5" />
                    Add any page link
                  </span>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      value={customPageInput}
                      onChange={(e) => setCustomPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomPage();
                        }
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-black/10 bg-[#FFFCF7] px-3.5 py-2.5 text-sm outline-none focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15"
                      placeholder="/contact or https://yoursite.com/about"
                    />
                    <button
                      type="button"
                      onClick={addCustomPage}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-[#141414] transition hover:bg-[#FFFCF7]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </div>

                {draft.showOnPages.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {draft.showOnPages.map((path) => {
                      const norm = normalizePageTarget(path) || path;
                      return (
                        <li
                          key={norm}
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#BC7C10]/25 bg-[#FFF8ED] py-1 pr-1 pl-2.5 text-[11px] font-semibold text-[#141414]"
                        >
                          <span className="truncate" title={norm}>
                            {labelForPageTarget(norm)}
                            <span className="ml-1 font-normal text-[#8a8174]">
                              {norm}
                            </span>
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${norm}`}
                            onClick={() => {
                              setDraft((d) => ({
                                ...d,
                                showOnPages: d.showOnPages.filter(
                                  (p) => normalizePageTarget(p) !== norm,
                                ),
                              }));
                            }}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#8a8174] transition hover:bg-black/5 hover:text-[#141414]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] px-3.5 py-3">
                <div>
                  <p className="text-sm font-bold text-[#141414]">
                    Offer dialog open
                  </p>
                  <p className="text-xs text-[#8a8174]">
                    Off = hidden on all selected pages
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.active}
                  onClick={() =>
                    setDraft((d) => ({ ...d, active: !d.active }))
                  }
                  className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                    draft.active ? "bg-[#22c55e]" : "bg-[#d4d0c8]"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition ${
                      draft.active ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#141414] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : editingId ? "Update offer" : "Create offer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#141414]/45"
            onClick={() => !saving && setDeleteTarget(null)}
          />
          <div className="relative z-[1] w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-sm font-bold text-[#141414]">Delete offer?</p>
            <p className="mt-1 text-xs text-[#8a8174]">
              “{deleteTarget.title}” will be removed permanently.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-black/10 py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDelete()}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white"
              >
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
