"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  ArrowUpRight,
  FolderPlus,
  ImagePlus,
  IndianRupee,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Pencil,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Users,
  CreditCard,
  X,
} from "lucide-react";
import {
  clearSuperAdminUser,
  getSuperAdminUser,
  isSuperAdminLoggedIn,
  superAdminLoginPathWithNext,
  touchSuperAdminSession,
  type SuperAdminUser,
} from "@/lib/super-admin-auth";
import { formatOrderDate, getOrders, statusLabel, type HexaOrder } from "@/lib/orders";
import { getAdminUsers } from "@/lib/admin-directory";
import {
  addAdminProduct,
  addAdminSection,
  deleteAdminProduct,
  deleteAdminSection,
  getAdminProductsBySection,
  getAdminSections,
  productImageSrc,
  updateAdminProduct,
  updateAdminSection,
  type AdminProductDraft,
  type AdminProductSection,
} from "@/lib/admin-products";
import type { CatalogProduct } from "@/lib/product-catalog";
import UsersPanel from "@/components/super-admin/User";
import CardsPanel from "@/components/super-admin/Cards";
import OrdersPanel from "@/components/super-admin/Orders";

type NavKey = "overview" | "orders" | "products" | "users" | "cards";

const MENU_ITEMS: { key: NavKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "products", label: "Products", icon: Package },
  { key: "users", label: "Users", icon: Users },
  { key: "cards", label: "Cards", icon: CreditCard },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function sectionMeta(key: NavKey) {
  switch (key) {
    case "overview":
      return {
        title: "Overview",
        subtitle: "Platform stats and recent activity at a glance.",
      };
    case "orders":
      return {
        title: "Orders",
        subtitle: "All customer orders across the platform.",
      };
    case "products":
      return {
        title: "Products",
        subtitle: "Manage categories and catalog products — add, edit, or delete.",
      };
    case "users":
      return {
        title: "Users",
        subtitle: "View, search, and manage registered customers.",
      };
    case "cards":
      return {
        title: "Cards",
        subtitle: "View, search, and manage all digital business cards.",
      };
  }
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
  badge,
}: {
  label: string;
  icon: typeof LayoutGrid;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
        active
          ? "bg-[#141414] text-white"
          : "text-[#4a4a4a] hover:bg-black/[0.04] hover:text-[#141414]"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? "text-[#BC7C10]" : "text-[#8a8a8a] group-hover:text-[#141414]"}`}
        strokeWidth={1.75}
      />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            active ? "bg-white/15 text-white" : "bg-[#F3F4F6] text-[#5c5346]"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            {label}
          </p>
          <p className="mt-2 font-dashboard text-2xl font-bold tracking-tight text-[#141414]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[#8a8174]">{hint}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8ED]">
          <Icon className="h-5 w-5 text-[#BC7C10]" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function isSameLocalDay(iso: string, ref = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth() &&
    date.getDate() === ref.getDate()
  );
}

function emptyDraft(): AdminProductDraft {
  return {
    title: "",
    shortTitle: "",
    category: "",
    description: "",
    price: 0,
    compareAtPrice: 0,
    ctaLabel: "",
    ctaHref: "",
    imageSrc: "",
    additionalImages: [],
    videoYoutubeId: "",
    videoThumbnail: "",
    highlights: [],
  };
}

function draftFromProduct(product: CatalogProduct): AdminProductDraft {
  const images = product.media.filter((m) => m.type === "image");
  const video = product.media.find((m) => m.type === "video");
  const primary = images[0];
  return {
    title: product.title,
    shortTitle: product.shortTitle,
    category: product.category,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    ctaLabel: product.ctaLabel,
    ctaHref: product.ctaHref,
    imageSrc:
      primary?.type === "image"
        ? primary.src
        : video?.type === "video"
          ? video.thumbnail
          : "",
    additionalImages: images
      .slice(1)
      .map((m) => (m.type === "image" ? m.src : ""))
      .filter(Boolean),
    videoYoutubeId: video?.type === "video" ? video.youtubeId : "",
    videoThumbnail: video?.type === "video" ? video.thumbnail : "",
    highlights: [...(product.highlights ?? [])],
  };
}

function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [active, setActive] = useState<NavKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<HexaOrder[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [sections, setSections] = useState<AdminProductSection[]>([]);
  const [productsBySection, setProductsBySection] = useState<
    Record<string, CatalogProduct[]>
  >({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminProductDraft>(emptyDraft());
  const [editError, setEditError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [addProductSectionId, setAddProductSectionId] = useState("");
  const [addProductDraft, setAddProductDraft] =
    useState<AdminProductDraft>(emptyDraft());
  const [addProductError, setAddProductError] = useState("");
  const [addBulletText, setAddBulletText] = useState("");
  const [editBulletText, setEditBulletText] = useState("");
  const [addExtraImageUrl, setAddExtraImageUrl] = useState("");
  const [editExtraImageUrl, setEditExtraImageUrl] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionSubtitle, setSectionSubtitle] = useState("");
  const [sectionImageSrc, setSectionImageSrc] = useState("");
  const [sectionError, setSectionError] = useState("");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (
      tab === "overview" ||
      tab === "orders" ||
      tab === "products" ||
      tab === "users" ||
      tab === "cards"
    ) {
      setActive(tab);
    } else if (tab === "messages") {
      setActive("overview");
      router.replace("/super-admin");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!isSuperAdminLoggedIn()) {
      router.replace(superAdminLoginPathWithNext("/super-admin"));
      return;
    }

    async function syncWorkspace() {
      const auth = getSuperAdminUser();
      if (!auth) {
        setAuthReady(false);
        router.replace(superAdminLoginPathWithNext("/super-admin"));
        return;
      }
      const touched = touchSuperAdminSession() ?? auth;
      setUser(touched);
      setOrders(getOrders());
      const nextSections = await getAdminSections();
      const bySection = await getAdminProductsBySection();
      setSections(nextSections);
      setProductsBySection(bySection);
      setProducts(nextSections.flatMap((s) => bySection[s.id] ?? []));
      setAuthReady(true);
    }

    void syncWorkspace();

    function onAuthChange() {
      void syncWorkspace();
    }

    async function onDataChange() {
      if (!getSuperAdminUser()) {
        setAuthReady(false);
        router.replace(superAdminLoginPathWithNext("/super-admin"));
        return;
      }
      touchSuperAdminSession();
      setOrders(getOrders());
      const nextSections = await getAdminSections();
      const bySection = await getAdminProductsBySection();
      setSections(nextSections);
      setProductsBySection(bySection);
      setProducts(nextSections.flatMap((s) => bySection[s.id] ?? []));
    }

    function onActivity() {
      if (!getSuperAdminUser()) {
        setAuthReady(false);
        router.replace(superAdminLoginPathWithNext("/super-admin"));
        return;
      }
      touchSuperAdminSession();
    }

    /** Catch expired sessions even when the tab sits idle */
    const sessionCheck = window.setInterval(() => {
      if (!getSuperAdminUser()) {
        setAuthReady(false);
        router.replace(superAdminLoginPathWithNext("/super-admin"));
      }
    }, 15_000);

    window.addEventListener("hexa-super-admin-auth-change", onAuthChange);
    window.addEventListener("hexa-orders-change", onDataChange);
    window.addEventListener("hexa-admin-directory-change", onDataChange);
    window.addEventListener("hexa-admin-products-change", onDataChange);
    window.addEventListener("focus", syncWorkspace);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.clearInterval(sessionCheck);
      window.removeEventListener("hexa-super-admin-auth-change", onAuthChange);
      window.removeEventListener("hexa-orders-change", onDataChange);
      window.removeEventListener("hexa-admin-directory-change", onDataChange);
      window.removeEventListener("hexa-admin-products-change", onDataChange);
      window.removeEventListener("focus", syncWorkspace);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [router]);

  const avatar = useMemo(() => (user ? initials(user.name) : "SA"), [user]);
  const copy = sectionMeta(active);
  const overviewStats = useMemo(() => {
    const totalOrders = orders.length;
    const todaysOrders = orders.filter((o) => isSameLocalDay(o.createdAt)).length;
    const totalUsers = getAdminUsers().length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    return { todaysOrders, totalOrders, totalUsers, totalRevenue };
  }, [orders]);
  const editingProduct = editingId
    ? products.find((p) => p.id === editingId) ?? null
    : null;

  function handleLogout() {
    clearSuperAdminUser();
    router.replace("/super-admin/login");
  }

  async function syncProducts() {
    const nextSections = await getAdminSections();
    const bySection = await getAdminProductsBySection();
    setSections(nextSections);
    setProductsBySection(bySection);
    setProducts(nextSections.flatMap((s) => bySection[s.id] ?? []));
  }

  function handleRefresh() {
    setRefreshing(true);
    setOrders(getOrders());
    void syncProducts().finally(() => {
      window.setTimeout(() => setRefreshing(false), 500);
    });
  }

  function selectNav(key: NavKey) {
    setActive(key);
    setSidebarOpen(false);
    router.replace(key === "overview" ? "/super-admin" : `/super-admin?tab=${key}`);
  }

  function openEdit(product: CatalogProduct) {
    setEditingId(product.id);
    setDraft(draftFromProduct(product));
    setEditBulletText("");
    setEditExtraImageUrl("");
    setEditError("");
  }

  function closeEdit() {
    setEditingId(null);
    setDraft(emptyDraft());
    setEditBulletText("");
    setEditExtraImageUrl("");
    setEditError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!draft.title.trim()) {
      setEditError("Title is required.");
      return;
    }
    if (!draft.category.trim()) {
      setEditError("Category is required.");
      return;
    }
    if (draft.price < 0) {
      setEditError("Price cannot be negative.");
      return;
    }
    const updated = await updateAdminProduct(editingId, draft);
    if (!updated) {
      setEditError("Product not found.");
      return;
    }
    await syncProducts();
    closeEdit();
  }

  function openAddProduct(sectionId?: string) {
    const fallback = sections[0]?.id ?? "";
    setAddProductSectionId(sectionId || fallback);
    setAddProductDraft(emptyDraft());
    setAddBulletText("");
    setAddExtraImageUrl("");
    setAddProductError("");
    setAddingProduct(true);
  }

  function closeAddProduct() {
    setAddingProduct(false);
    setAddProductDraft(emptyDraft());
    setAddBulletText("");
    setAddExtraImageUrl("");
    setAddProductError("");
  }

  function addBulletToDraft(
    setter: typeof setAddProductDraft,
    bullet: string,
    clear: () => void,
  ) {
    const text = bullet.trim();
    if (!text) return;
    setter((d) => ({
      ...d,
      highlights: [...d.highlights, text],
    }));
    clear();
  }

  function removeBulletFromDraft(
    setter: typeof setAddProductDraft,
    index: number,
  ) {
    setter((d) => ({
      ...d,
      highlights: d.highlights.filter((_, i) => i !== index),
    }));
  }

  async function handleImageFile(
    file: File | undefined,
    setter: typeof setAddProductDraft,
    onError?: (message: string) => void,
  ) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError?.("Please choose an image file.");
      return;
    }
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setter((d) => ({ ...d, imageSrc: dataUrl }));
    } catch {
      onError?.("Could not read the image file.");
    }
  }

  async function handleAdditionalImageFile(
    file: File | undefined,
    setter: typeof setAddProductDraft,
    onError?: (message: string) => void,
  ) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError?.("Please choose an image file.");
      return;
    }
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setter((d) => ({
        ...d,
        additionalImages: [...d.additionalImages, dataUrl],
      }));
    } catch {
      onError?.("Could not read the image file.");
    }
  }

  function addAdditionalImageUrl(
    setter: typeof setAddProductDraft,
    url: string,
  ) {
    const trimmed = url.trim();
    if (!trimmed) return;
    setter((d) => ({
      ...d,
      additionalImages: [...d.additionalImages, trimmed],
    }));
  }

  function removeAdditionalImage(
    setter: typeof setAddProductDraft,
    index: number,
  ) {
    setter((d) => ({
      ...d,
      additionalImages: d.additionalImages.filter((_, i) => i !== index),
    }));
  }

  function renderMediaFields(
    current: AdminProductDraft,
    setter: typeof setAddProductDraft,
    onError: (message: string) => void,
    extraUrl: string,
    setExtraUrl: (value: string) => void,
  ) {
    return (
      <>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
            Product image
          </label>
          <div className="rounded-xl border border-black/10 bg-[#FFFCF7] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-black/[0.06]">
                {current.imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.imageSrc}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#8a8174]">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    void handleImageFile(e.target.files?.[0], setter, onError)
                  }
                  className="block w-full text-xs text-[#5c5346] file:mr-3 file:rounded-lg file:border-0 file:bg-[#BC7C10] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#9a650d]"
                />
                <input
                  value={
                    current.imageSrc.startsWith("data:") ? "" : current.imageSrc
                  }
                  onChange={(e) =>
                    setter((d) => ({ ...d, imageSrc: e.target.value }))
                  }
                  placeholder="Or paste image URL / path"
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
                {current.imageSrc ? (
                  <button
                    type="button"
                    onClick={() => setter((d) => ({ ...d, imageSrc: "" }))}
                    className="text-xs font-semibold text-[#E24C4C] hover:underline"
                  >
                    Remove image
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
            Additional images
          </label>
          <div className="rounded-xl border border-black/10 bg-[#FFFCF7] p-3 space-y-3">
            {current.additionalImages.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {current.additionalImages.map((src, index) => (
                  <div
                    key={`${src.slice(0, 24)}-${index}`}
                    className="group relative h-16 w-16 overflow-hidden rounded-lg bg-white ring-1 ring-black/[0.06]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(setter, index)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remove additional image"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8a8174]">
                Optional gallery images shown on the product page.
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                void handleAdditionalImageFile(
                  e.target.files?.[0],
                  setter,
                  onError,
                );
                e.target.value = "";
              }}
              className="block w-full text-xs text-[#5c5346] file:mr-3 file:rounded-lg file:border-0 file:bg-[#BC7C10] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#9a650d]"
            />
            <div className="flex gap-2">
              <input
                value={extraUrl}
                onChange={(e) => setExtraUrl(e.target.value)}
                placeholder="Or paste additional image URL"
                className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  addAdditionalImageUrl(setter, extraUrl);
                  setExtraUrl("");
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-xs font-semibold text-[#141414] hover:bg-black/[0.03]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  async function saveAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!addProductSectionId) {
      setAddProductError("Choose a category.");
      return;
    }
    if (!addProductDraft.title.trim()) {
      setAddProductError("Title is required.");
      return;
    }
    if (addProductDraft.price < 0) {
      setAddProductError("Price cannot be negative.");
      return;
    }
    const created = await addAdminProduct(addProductSectionId, {
      ...addProductDraft,
      shortTitle:
        addProductDraft.shortTitle.trim() || addProductDraft.title.trim(),
      category: addProductDraft.category.trim() || "General",
      ctaLabel: addProductDraft.ctaLabel.trim() || "Order now",
    });
    if (!created) {
      setAddProductError("Could not add product.");
      return;
    }
    await syncProducts();
    closeAddProduct();
  }

  function openAddSection() {
    setEditingSectionId(null);
    setSectionTitle("");
    setSectionSubtitle("");
    setSectionImageSrc("");
    setSectionError("");
    setAddingSection(true);
  }

  function openEditSection(section: AdminProductSection) {
    setEditingSectionId(section.id);
    setSectionTitle(section.title);
    setSectionSubtitle(section.subtitle);
    setSectionImageSrc(section.imageSrc ?? "");
    setSectionError("");
    setAddingSection(true);
  }

  function closeAddSection() {
    setAddingSection(false);
    setEditingSectionId(null);
    setSectionTitle("");
    setSectionSubtitle("");
    setSectionImageSrc("");
    setSectionError("");
  }

  async function handleSectionImageFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSectionError("Please choose an image file.");
      return;
    }
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setSectionImageSrc(dataUrl);
      setSectionError("");
    } catch {
      setSectionError("Could not read the image file.");
    }
  }

  async function saveAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionTitle.trim()) {
      setSectionError("Category name is required.");
      return;
    }

    if (editingSectionId) {
      const updated = await updateAdminSection(editingSectionId, {
        title: sectionTitle,
        subtitle: sectionSubtitle,
        imageSrc: sectionImageSrc,
      });
      if (!updated) {
        setSectionError("Could not update category.");
        return;
      }
    } else {
      const created = await addAdminSection({
        title: sectionTitle,
        subtitle: sectionSubtitle,
        imageSrc: sectionImageSrc,
      });
      if (!created) {
        setSectionError("Could not create category.");
        return;
      }
    }

    await syncProducts();
    closeAddSection();
  }

  function confirmDelete(id: string) {
    setDeleteConfirmId(id);
  }

  function cancelDelete() {
    setDeleteConfirmId(null);
  }

  async function runDelete() {
    if (!deleteConfirmId) return;
    await deleteAdminProduct(deleteConfirmId);
    await syncProducts();
    if (editingId === deleteConfirmId) closeEdit();
    setDeleteConfirmId(null);
  }

  function confirmDeleteSection(id: string) {
    setDeleteSectionId(id);
  }

  function cancelDeleteSection() {
    setDeleteSectionId(null);
  }

  async function runDeleteSection() {
    if (!deleteSectionId) return;
    await deleteAdminSection(deleteSectionId, { deleteProducts: true });
    await syncProducts();
    if (addProductSectionId === deleteSectionId) {
      setAddProductSectionId("");
    }
    setDeleteSectionId(null);
  }

  function renderProductTable(list: CatalogProduct[]) {
    if (list.length === 0) {
      return (
        <p className="px-5 py-8 text-sm text-[#8a8174]">No products in this category.</p>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[34%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-black/[0.06] text-[11px] font-bold tracking-wide text-[#8a8174] uppercase">
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Compare</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((product, index) => {
              const img = productImageSrc(product);
              return (
                <tr
                  key={product.id}
                  className="border-b border-black/[0.04] last:border-0"
                >
                  <td className="px-4 py-3 text-sm font-semibold tabular-nums text-[#8a8174]">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6]">
                        {img ? (
                          <Image
                            src={img}
                            alt={product.shortTitle}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#141414]">
                          {product.shortTitle || product.title}
                        </p>
                        <p className="truncate text-xs text-[#8a8174]">
                          {product.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#8a8174]">
                    {formatCurrency(product.compareAtPrice)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(product.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E24C4C]/25 bg-white px-3 py-1.5 text-xs font-semibold text-[#E24C4C] transition-colors hover:bg-[#E24C4C]/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (!authReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#BC7C10]/25 border-t-[#BC7C10]" />
          <p className="mt-3 text-sm font-medium text-[#5c5346]">
            Loading admin panel…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#FAFAF8] text-[#141414]">
      <header className="z-40 shrink-0 border-b border-black/[0.06] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-[60px] sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#141414] hover:bg-black/[0.04] lg:hidden"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="relative h-8 w-[132px] sm:h-9 sm:w-[150px]">
              <Image
                src="/Images/Hexacards.png"
                alt="HexaCards"
                fill
                priority
                className="object-contain object-left"
                sizes="150px"
              />
            </Link>
            <span className="hidden h-5 w-px bg-black/10 sm:block" />
            <span className="hidden text-xs font-medium tracking-wide text-[#8a8174] uppercase sm:inline">
              Super Admin
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-[#5c5346] hover:bg-black/[0.04] sm:flex"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
            <Link
              href="/"
              className="hidden items-center gap-1 text-sm font-medium text-[#5c5346] transition-colors hover:text-[#141414] md:inline-flex"
            >
              Back to website
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <div className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white py-1.5 pr-3 pl-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#141414] text-[11px] font-bold text-white">
                {avatar}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-xs font-semibold text-[#141414]">
                  {user.name}
                </p>
                <p className="truncate text-[10px] text-[#8a8174]">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5c5346] hover:bg-black/[0.04]"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 overflow-hidden lg:gap-8 lg:px-8 lg:py-6">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[264px] transform border-r border-black/[0.06] bg-white pt-14 transition-transform lg:static lg:z-auto lg:block lg:w-[264px] lg:shrink-0 lg:translate-x-0 lg:self-stretch lg:rounded-xl lg:border lg:pt-0 lg:shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3 lg:hidden">
            <span className="text-sm font-semibold">Menu</span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/[0.04]"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="space-y-1 p-3">
            {MENU_ITEMS.map((item) => (
              <NavButton
                key={item.key}
                label={item.label}
                icon={item.icon}
                active={active === item.key}
                onClick={() => selectNav(item.key)}
                badge={
                  item.key === "orders"
                    ? String(orders.length)
                    : item.key === "products"
                      ? String(products.length)
                      : undefined
                }
              />
            ))}
          </nav>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            aria-label="Close menu overlay"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <main className="admin-main-scroll min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-0 lg:py-0">
          <div className="mb-6">
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
              {copy.title}
            </p>
            <h1 className="font-dashboard mt-1 text-2xl font-bold tracking-tight text-[#141414] sm:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-1 text-sm text-[#8a8174]">{copy.subtitle}</p>
          </div>

          {active === "overview" ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Today's orders"
                  value={overviewStats.todaysOrders}
                  hint="Orders placed today"
                  icon={ShoppingBag}
                />
                <StatCard
                  label="Total orders"
                  value={overviewStats.totalOrders}
                  hint="All platform orders"
                  icon={Package}
                />
                <StatCard
                  label="Total users"
                  value={overviewStats.totalUsers}
                  hint="Unique customers"
                  icon={Users}
                />
                <StatCard
                  label="Total revenue"
                  value={formatCurrency(overviewStats.totalRevenue)}
                  hint="Sum of order totals"
                  icon={IndianRupee}
                />
              </div>

              <div className="rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <div className="border-b border-black/[0.06] px-5 py-4">
                  <h2 className="font-dashboard text-base font-bold text-[#141414]">
                    Recent orders
                  </h2>
                </div>
                {orders.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-[#8a8174]">No orders yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/[0.06] text-[11px] font-bold tracking-wide text-[#8a8174] uppercase">
                          <th className="px-5 py-3">Order</th>
                          <th className="px-5 py-3">Customer</th>
                          <th className="px-5 py-3">Product</th>
                          <th className="px-5 py-3">Total</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((order) => (
                          <tr
                            key={order.id}
                            className="border-b border-black/[0.04] last:border-0"
                          >
                            <td className="px-5 py-3">
                              <p className="font-medium text-[#141414]">{order.id}</p>
                              <p className="text-xs text-[#8a8174]">
                                {formatOrderDate(order.createdAt)}
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              <p className="font-medium">{order.customerName}</p>
                              <p className="text-xs text-[#8a8174]">+91 {order.phone}</p>
                            </td>
                            <td className="px-5 py-3">{order.productTitle}</td>
                            <td className="px-5 py-3 font-medium">
                              {formatCurrency(order.total)}
                            </td>
                            <td className="px-5 py-3">
                              <span className="rounded-md bg-[#FFF8ED] px-2 py-1 text-xs font-semibold text-[#9a650d]">
                                {statusLabel(order.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {active === "orders" ? (
            <OrdersPanel orders={orders} />
          ) : null}

          {active === "products" ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={openAddSection}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-sm font-semibold text-[#141414] transition-colors hover:bg-black/[0.03]"
                >
                  <FolderPlus className="h-4 w-4 text-[#BC7C10]" />
                  Add category
                </button>
                <button
                  type="button"
                  onClick={() => openAddProduct()}
                  disabled={sections.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#BC7C10] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#9a650d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add product
                </button>
              </div>

              {sections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/10 bg-white px-5 py-10 text-center">
                  <p className="text-sm text-[#8a8174]">
                    No categories yet. Create a category first, then add products.
                  </p>
                  <button
                    type="button"
                    onClick={openAddSection}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#BC7C10] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9a650d]"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Add category
                  </button>
                </div>
              ) : null}

              {sections.map((section) => {
                const list = productsBySection[section.id] ?? [];
                return (
                  <section
                    key={section.id}
                    className="rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#FFF8ED] ring-1 ring-black/[0.06]">
                          {section.imageSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={section.imageSrc}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#BC7C10]/70">
                              <ImagePlus className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                            Category
                          </p>
                          <h2 className="font-dashboard mt-0.5 text-base font-bold text-[#141414]">
                            {section.title}
                          </h2>
                          <p className="mt-1 text-sm text-[#8a8174]">
                            {section.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-[#FFF8ED] px-2.5 py-1 text-xs font-bold text-[#9a650d]">
                          {list.length} product{list.length === 1 ? "" : "s"}
                        </span>
                        <button
                          type="button"
                          onClick={() => openAddProduct(section.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#141414] hover:bg-black/[0.03]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add product
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditSection(section)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-[#5c5346] transition-colors hover:bg-black/[0.03]"
                          aria-label="Edit category"
                          title="Edit category"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDeleteSection(section.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E24C4C]/25 bg-white text-[#E24C4C] transition-colors hover:bg-[#E24C4C]/5"
                          aria-label="Delete category"
                          title="Delete category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {renderProductTable(list)}
                  </section>
                );
              })}
            </div>
          ) : null}

          {active === "users" ? <UsersPanel /> : null}

          {active === "cards" ? <CardsPanel /> : null}
        </main>
      </div>

      {editingProduct ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={closeEdit}
            aria-hidden="true"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                  Edit product
                </p>
                <h2 className="font-dashboard text-lg font-bold text-[#141414]">
                  {editingProduct.shortTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/[0.04]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveEdit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Title
                </label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    Short title
                  </label>
                  <input
                    value={draft.shortTitle}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, shortTitle: e.target.value }))
                    }
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    Category
                  </label>
                  <input
                    value={draft.category}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, category: e.target.value }))
                    }
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Sub points
                </label>
                <div className="rounded-xl border border-black/10 bg-[#FFFCF7] p-3">
                  <div className="flex gap-2">
                    <input
                      value={editBulletText}
                      onChange={(e) => setEditBulletText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addBulletToDraft(setDraft, editBulletText, () =>
                            setEditBulletText(""),
                          );
                        }
                      }}
                      placeholder="Type a bullet point, then Add"
                      className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addBulletToDraft(setDraft, editBulletText, () =>
                          setEditBulletText(""),
                        )
                      }
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#141414] px-3 py-2 text-xs font-semibold text-white hover:bg-black/80"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                  {draft.highlights.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {draft.highlights.map((point, index) => (
                        <li
                          key={`${point}-${index}`}
                          className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm text-[#141414] ring-1 ring-black/[0.05]"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#BC7C10]" />
                          <span className="min-w-0 flex-1">{point}</span>
                          <button
                            type="button"
                            onClick={() => removeBulletFromDraft(setDraft, index)}
                            className="shrink-0 rounded-md p-1 text-[#E24C4C] hover:bg-[#E24C4C]/5"
                            aria-label="Remove point"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-[#8a8174]">
                      No sub points yet. Add them one by one.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draft.price}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, price: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    Compare at (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draft.compareAtPrice}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        compareAtPrice: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    CTA label
                  </label>
                  <input
                    value={draft.ctaLabel}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, ctaLabel: e.target.value }))
                    }
                    placeholder="Order now"
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
              </div>

              {renderMediaFields(
                draft,
                setDraft,
                setEditError,
                editExtraImageUrl,
                setEditExtraImageUrl,
              )}

              {editError ? (
                <p className="rounded-lg bg-[#E24C4C]/10 px-3 py-2 text-sm text-[#E24C4C]">
                  {editError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#5c5346] hover:bg-black/[0.03]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#BC7C10] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9a650d]"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteConfirmId ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div
            className="absolute inset-0"
            onClick={cancelDelete}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-black/[0.06] bg-white p-6 shadow-xl">
            <h3 className="font-dashboard text-lg font-bold text-[#141414]">
              Delete product?
            </h3>
            <p className="mt-2 text-sm text-[#5c5346]">
              This removes the product from the admin catalog list. You can refresh
              the page catalog by clearing browser storage later if needed.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#5c5346] hover:bg-black/[0.03]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runDelete}
                className="rounded-xl bg-[#E24C4C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#c93d3d]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteSectionId ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div
            className="absolute inset-0"
            onClick={cancelDeleteSection}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-black/[0.06] bg-white p-6 shadow-xl">
            <h3 className="font-dashboard text-lg font-bold text-[#141414]">
              Delete category?
            </h3>
            <p className="mt-2 text-sm text-[#5c5346]">
              This removes the category and all products inside it from the admin
              catalog.
              {sections.find((s) => s.id === deleteSectionId)?.title
                ? ` (“${sections.find((s) => s.id === deleteSectionId)?.title}”)`
                : ""}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelDeleteSection}
                className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#5c5346] hover:bg-black/[0.03]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runDeleteSection}
                className="rounded-xl bg-[#E24C4C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#c93d3d]"
              >
                Delete category
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addingSection ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="absolute inset-0" onClick={closeAddSection} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                  {editingSectionId ? "Edit category" : "New category"}
                </p>
                <h2 className="font-dashboard text-lg font-bold text-[#141414]">
                  {editingSectionId ? "Update category" : "Add category"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeAddSection}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/[0.04]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveAddSection} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Category name
                </label>
                <input
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  placeholder="e.g. Accessories"
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Category description
                </label>
                <textarea
                  value={sectionSubtitle}
                  onChange={(e) => setSectionSubtitle(e.target.value)}
                  placeholder="Short description for this category"
                  rows={3}
                  className="w-full resize-y rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Category image
                </label>
                <div className="rounded-xl border border-black/10 bg-[#FFFCF7] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-black/[0.06]">
                      {sectionImageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sectionImageSrc}
                          alt="Category preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#8a8174]">
                          <ImagePlus className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          void handleSectionImageFile(e.target.files?.[0])
                        }
                        className="block w-full text-xs text-[#5c5346] file:mr-3 file:rounded-lg file:border-0 file:bg-[#BC7C10] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#9a650d]"
                      />
                      <input
                        value={
                          sectionImageSrc.startsWith("data:")
                            ? ""
                            : sectionImageSrc
                        }
                        onChange={(e) => setSectionImageSrc(e.target.value)}
                        placeholder="Or paste image URL / path"
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                      />
                      {sectionImageSrc ? (
                        <button
                          type="button"
                          onClick={() => setSectionImageSrc("")}
                          className="text-xs font-semibold text-[#E24C4C] hover:underline"
                        >
                          Remove image
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              {sectionError ? (
                <p className="rounded-lg bg-[#E24C4C]/10 px-3 py-2 text-sm text-[#E24C4C]">
                  {sectionError}
                </p>
              ) : null}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeAddSection}
                  className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#5c5346] hover:bg-black/[0.03]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#BC7C10] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9a650d]"
                >
                  {editingSectionId ? "Save changes" : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {addingProduct ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="absolute inset-0" onClick={closeAddProduct} aria-hidden="true" />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
                  New product
                </p>
                <h2 className="font-dashboard text-lg font-bold text-[#141414]">
                  Add product
                </h2>
              </div>
              <button
                type="button"
                onClick={closeAddProduct}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/[0.04]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveAddProduct} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Category
                </label>
                <select
                  value={addProductSectionId}
                  onChange={(e) => setAddProductSectionId(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Title
                </label>
                <input
                  value={addProductDraft.title}
                  onChange={(e) =>
                    setAddProductDraft((d) => ({ ...d, title: e.target.value }))
                  }
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    Short title
                  </label>
                  <input
                    value={addProductDraft.shortTitle}
                    onChange={(e) =>
                      setAddProductDraft((d) => ({
                        ...d,
                        shortTitle: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    Category
                  </label>
                  <input
                    value={addProductDraft.category}
                    onChange={(e) =>
                      setAddProductDraft((d) => ({
                        ...d,
                        category: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={addProductDraft.description}
                  onChange={(e) =>
                    setAddProductDraft((d) => ({
                      ...d,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  Sub points
                </label>
                <div className="rounded-xl border border-black/10 bg-[#FFFCF7] p-3">
                  <div className="flex gap-2">
                    <input
                      value={addBulletText}
                      onChange={(e) => setAddBulletText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addBulletToDraft(
                            setAddProductDraft,
                            addBulletText,
                            () => setAddBulletText(""),
                          );
                        }
                      }}
                      placeholder="Type a bullet point, then Add"
                      className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addBulletToDraft(
                          setAddProductDraft,
                          addBulletText,
                          () => setAddBulletText(""),
                        )
                      }
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#141414] px-3 py-2 text-xs font-semibold text-white hover:bg-black/80"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                  {addProductDraft.highlights.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {addProductDraft.highlights.map((point, index) => (
                        <li
                          key={`${point}-${index}`}
                          className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm text-[#141414] ring-1 ring-black/[0.05]"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#BC7C10]" />
                          <span className="min-w-0 flex-1">{point}</span>
                          <button
                            type="button"
                            onClick={() =>
                              removeBulletFromDraft(setAddProductDraft, index)
                            }
                            className="shrink-0 text-[#E24C4C] hover:bg-[#E24C4C]/5 rounded-md p-1"
                            aria-label="Remove point"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-[#8a8174]">
                      No sub points yet. Add them one by one.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={addProductDraft.price}
                    onChange={(e) =>
                      setAddProductDraft((d) => ({
                        ...d,
                        price: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                    Compare at (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={addProductDraft.compareAtPrice}
                    onChange={(e) =>
                      setAddProductDraft((d) => ({
                        ...d,
                        compareAtPrice: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#5c5346]">
                  CTA label
                </label>
                <input
                  value={addProductDraft.ctaLabel}
                  onChange={(e) =>
                    setAddProductDraft((d) => ({
                      ...d,
                      ctaLabel: e.target.value,
                    }))
                  }
                  placeholder="Order now"
                  className="w-full rounded-xl border border-black/10 bg-[#FFFCF7] px-3 py-2.5 text-sm focus:border-[#BC7C10] focus:ring-2 focus:ring-[#BC7C10]/20 focus:outline-none"
                />
              </div>

              {renderMediaFields(
                addProductDraft,
                setAddProductDraft,
                setAddProductError,
                addExtraImageUrl,
                setAddExtraImageUrl,
              )}

              {addProductError ? (
                <p className="rounded-lg bg-[#E24C4C]/10 px-3 py-2 text-sm text-[#E24C4C]">
                  {addProductError}
                </p>
              ) : null}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeAddProduct}
                  className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#5c5346] hover:bg-black/[0.03]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#BC7C10] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9a650d]"
                >
                  Add product
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
