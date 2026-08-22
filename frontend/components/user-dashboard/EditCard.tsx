"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Eye,
  Globe,
  Link2,
  Menu,
  Palette,
  Pencil,
  Phone,
  Plus,
  Share2,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  getAuthUser,
  isLoggedIn,
  loginPathWithNext,
  type HexaAuthUser,
} from "@/lib/auth";
import { hasPlacedOrder, getOrdersForPhone, type HexaOrder } from "@/lib/orders";
import {
  loadOrderCardProfile,
  saveOrderCardProfile,
} from "@/lib/order-card-profile";
import { resolveOrderLiveUrl } from "@/lib/order-card";
import {
  cardPublicSlug,
  cardPublicUrl,
  cardPublicPath,
  clearBrochureFile,
  formatFileSize,
  getCardProfile,
  normalizePhoneForInput,
  saveBrochureFile,
  saveCardProfile,
  BROCHURE_MAX_BYTES,
  CARD_ACCENT_COLORS,
  DEFAULT_CARD_AVATAR,
  DEFAULT_CARD_BANNER,
  isDefaultCoverImage,
  isDefaultLogoImage,
  multicolorWheelStyle,
  type CardLayoutId,
  type HexaCardProfile,
} from "@/lib/card-profile";
import PhoneNumberField from "./PhoneNumberField";
import ProfileBanner from "./ProfileBanner";
import ImageCropModal, {
  readFileAsDataUrl,
  type CropKind,
} from "./ImageCropModal";
import PhoneFrame from "@/components/Layouts/PhoneFrame";
import LayoutPhonePreview from "@/components/Layouts/LayoutPhonePreview";
import { CARD_LAYOUTS } from "@/components/Layouts";

type EditTab = "contact" | "social" | "businessInfo" | "appearance";

const TABS: { key: EditTab; label: string; icon: typeof Phone }[] = [
  { key: "contact", label: "Contact Info", icon: Phone },
  { key: "social", label: "Social Links", icon: Share2 },
  { key: "businessInfo", label: "Business Info", icon: Briefcase },
  { key: "appearance", label: "Appearance", icon: Palette },
];

const ACCENTS = [...CARD_ACCENT_COLORS];

function fieldClass() {
  return "mt-1.5 w-full rounded-lg border border-black/10 bg-[#FAFAF8] px-3.5 py-2.5 text-sm text-[#141414] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15";
}

function labelClass() {
  return "text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase";
}

export default function EditCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<HexaAuthUser | null>(null);
  const [profile, setProfile] = useState<HexaCardProfile | null>(null);
  const [tab, setTab] = useState<EditTab>("contact");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [serviceInput, setServiceInput] = useState("");
  const brochureRef = useRef<HTMLInputElement>(null);
  const [brochureError, setBrochureError] = useState("");
  const [cropState, setCropState] = useState<{
    src: string;
    kind: CropKind;
  } | null>(null);
  const [defaultConfirm, setDefaultConfirm] = useState<
    null | "cover" | "logo"
  >(null);
  const [layoutConfirm, setLayoutConfirm] = useState<CardLayoutId | null>(
    null,
  );
  const [editingOrder, setEditingOrder] = useState<HexaOrder | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace(loginPathWithNext("/dashboard/edit-card"));
      return;
    }
    const auth = getAuthUser();
    if (!auth || !hasPlacedOrder(auth.phone)) {
      router.replace("/dashboard");
      return;
    }
    setUser(auth);
    if (orderId) {
      const order = getOrdersForPhone(auth.phone).find((o) => o.id === orderId);
      if (order) {
        setEditingOrder(order);
        setProfile(loadOrderCardProfile(order, auth.name, auth.phone));
      } else {
        setEditingOrder(null);
        setProfile(getCardProfile(auth.name, auth.phone));
      }
    } else {
      setEditingOrder(null);
      setProfile(getCardProfile(auth.name, auth.phone));
    }
    setAuthReady(true);
  }, [router, orderId]);

  function persistProfile(next: HexaCardProfile): HexaCardProfile {
    if (editingOrder) {
      return saveOrderCardProfile(editingOrder.id, next);
    }
    return saveCardProfile(next);
  }

  function updateContact<K extends keyof HexaCardProfile["contact"]>(
    key: K,
    value: HexaCardProfile["contact"][K],
  ) {
    setProfile((p) =>
      p ? { ...p, contact: { ...p.contact, [key]: value } } : p,
    );
  }

  function updateSocial<K extends keyof HexaCardProfile["social"]>(
    key: K,
    value: HexaCardProfile["social"][K],
  ) {
    setProfile((p) =>
      p ? { ...p, social: { ...p.social, [key]: value } } : p,
    );
  }

  function updateAppearance<K extends keyof HexaCardProfile["appearance"]>(
    key: K,
    value: HexaCardProfile["appearance"][K],
  ) {
    setProfile((p) =>
      p ? { ...p, appearance: { ...p.appearance, [key]: value } } : p,
    );
  }

  function requestDefaultImage(kind: "cover" | "logo") {
    if (!profile) return;
    if (kind === "cover" && isDefaultCoverImage(profile.appearance.coverImage)) {
      return;
    }
    if (kind === "logo" && isDefaultLogoImage(profile.appearance.logoImage)) {
      return;
    }
    setDefaultConfirm(kind);
  }

  function applyDefaultImage() {
    if (!defaultConfirm) return;
    if (defaultConfirm === "cover") {
      updateAppearance("coverImage", DEFAULT_CARD_BANNER);
    } else {
      updateAppearance("logoImage", DEFAULT_CARD_AVATAR);
    }
    setDefaultConfirm(null);
  }

  function requestLayoutChange(id: CardLayoutId) {
    if (!profile) return;
    const meta = CARD_LAYOUTS.find((l) => l.id === id);
    if (!meta?.available) return;
    if ((profile.appearance.layout ?? "classic") === id) return;
    setLayoutConfirm(id);
  }

  function applyLayout() {
    if (!layoutConfirm || !profile) return;
    const id = layoutConfirm;
    const next: HexaCardProfile = {
      ...profile,
      appearance: {
        ...profile.appearance,
        layout: id,
      },
    };
    setLayoutConfirm(null);
    try {
      const saved = persistProfile(next);
      setProfile(saved);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1800);
    } catch {
      // Keep the UI on the chosen layout even if storage fails
      setProfile(next);
      window.alert(
        "Layout updated in the editor, but could not be saved. Please tap Save.",
      );
    }
  }

  function updateBusinessAbout(value: string) {
    setProfile((p) =>
      p ? { ...p, business: { ...p.business, about: value } } : p,
    );
  }

  function addService() {
    const name = serviceInput.trim();
    if (!name || !profile) return;
    const existing = Array.isArray(profile.business?.services)
      ? profile.business.services
      : [];
    // No maximum — only block exact duplicate names
    if (existing.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setServiceInput("");
      window.alert("That service is already on your list.");
      return;
    }
    setProfile((p) => {
      if (!p) return p;
      const current = Array.isArray(p.business?.services)
        ? p.business.services
        : [];
      return {
        ...p,
        business: {
          ...p.business,
          about: p.business?.about ?? "",
          services: [...current, name],
        },
      };
    });
    setServiceInput("");
  }

  function removeService(index: number) {
    setProfile((p) => {
      if (!p) return p;
      const current = Array.isArray(p.business?.services)
        ? p.business.services
        : [];
      return {
        ...p,
        business: {
          ...p.business,
          about: p.business?.about ?? "",
          services: current.filter((_, i) => i !== index),
        },
      };
    });
  }

  async function openImageCrop(file: File | undefined, kind: CropKind) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const src = await readFileAsDataUrl(file);
      setCropState({ src, kind });
    } catch {
      window.alert("Could not open this image. Please try another file.");
    }
  }

  function applyCroppedImage(dataUrl: string) {
    if (!cropState) return;
    if (cropState.kind === "profile") updateAppearance("logoImage", dataUrl);
    else if (cropState.kind === "background")
      updateAppearance("coverImage", dataUrl);
    else updateAppearance("shareImage", dataUrl);
    setCropState(null);
  }

  async function handleBrochureUpload(file: File | undefined) {
    if (!file || !profile) return;
    setBrochureError("");
    if (file.size > BROCHURE_MAX_BYTES) {
      setBrochureError("Brochure must be 5 MB or smaller.");
      return;
    }
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (file.type && !allowed.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g|webp|docx?)$/i)) {
      setBrochureError("Use PDF, DOC, DOCX, or image files only.");
      return;
    }
    try {
      await saveBrochureFile(file);
      setProfile({
        ...profile,
        contact: {
          ...profile.contact,
          brochureName: file.name,
          brochureMime: file.type || "application/octet-stream",
          brochureSize: file.size,
        },
      });
    } catch (err) {
      setBrochureError(
        err instanceof Error ? err.message : "Could not save brochure.",
      );
    }
  }

  async function handleBrochureClear() {
    if (!profile) return;
    setBrochureError("");
    await clearBrochureFile();
    setProfile({
      ...profile,
      contact: {
        ...profile.contact,
        brochureName: null,
        brochureMime: null,
        brochureSize: null,
      },
    });
  }

  function handleSave() {
    if (!profile) return;
    try {
      const next = persistProfile(profile);
      setProfile(next);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1800);
    } catch {
      // Last-resort: clear images and save contact/social data
      const stripped = {
        ...profile,
        appearance: {
          ...profile.appearance,
          coverImage: DEFAULT_CARD_BANNER,
          logoImage: DEFAULT_CARD_AVATAR,
          shareImage: null,
        },
      };
      const next = persistProfile(stripped);
      setProfile(next);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1800);
      window.alert(
        "Images were too large for browser storage. Profile details were saved without images — please re-upload smaller photos.",
      );
    }
  }

  function goNext() {
    if (tab === "contact") setTab("social");
    else if (tab === "social") setTab("businessInfo");
    else if (tab === "businessInfo") setTab("appearance");
    else handleSave();
  }

  if (!authReady || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#BC7C10]/25 border-t-[#BC7C10]" />
          <p className="mt-3 text-sm font-medium text-[#5c5346]">
            Loading card editor…
          </p>
        </div>
      </div>
    );
  }

  const cardShareUrl = editingOrder
    ? resolveOrderLiveUrl(editingOrder).liveUrl
    : cardPublicUrl(profile);
  const cardSharePath = editingOrder
    ? `/${resolveOrderLiveUrl(editingOrder).slug}`
    : cardPublicPath(profile);
  const slug = editingOrder
    ? resolveOrderLiveUrl(editingOrder).slug
    : cardPublicSlug(profile);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#141414]">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-[60px] sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/[0.04] lg:hidden"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5c5346] hover:text-[#141414]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="hidden h-5 w-px bg-black/10 sm:block" />
            <p className="font-dashboard text-sm font-bold tracking-tight sm:text-base">
              Edit card
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={cardPublicPath(profile)}
              target="_blank"
              className="hidden items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] font-semibold text-[#141414] hover:bg-[#FAFAF8] sm:inline-flex"
            >
              <Eye className="h-3.5 w-3.5" />
              View card
            </Link>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#BC7C10] px-3.5 py-2 text-[13px] font-bold text-white hover:bg-[#9a650d]"
            >
              {savedFlash ? <Check className="h-3.5 w-3.5" /> : null}
              {savedFlash ? "Saved" : "Update"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-[#141414]/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-black/[0.06] bg-[#141414] text-white transition-transform duration-300 lg:sticky lg:top-[60px] lg:z-0 lg:h-[calc(100vh-60px)] lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
            <p className="text-sm font-semibold">Card menu</p>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">
              Main navigation
            </p>
            <Link
              href="/dashboard"
              className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/70 hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>

            <div className="mb-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <p className="truncate text-sm font-semibold text-white">
                {profile.contact.cardName || user.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/50">
                {[profile.contact.title, profile.contact.businessName]
                  .filter((v) => v.trim())
                  .join(" - ") || "Digital business card"}
              </p>
            </div>

            <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">
              Edit sections
            </p>
            <nav className="space-y-0.5">
              {TABS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setTab(item.key);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-[#BC7C10] text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? "bg-white" : "bg-transparent"
                      }`}
                    />
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-visible rounded-xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-7">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] pb-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[#BC7C10] uppercase">
                    {tab === "contact"
                      ? "Contact Info"
                      : tab === "social"
                        ? "Social Links"
                        : tab === "businessInfo"
                          ? "Business Info"
                          : "Appearance"}
                  </p>
                  <h1 className="mt-1 font-dashboard text-xl font-extrabold tracking-[-0.02em]">
                    {tab === "contact"
                      ? "Edit card info"
                      : tab === "social"
                        ? "Social & review links"
                        : tab === "businessInfo"
                          ? "Edit card business info"
                          : "Card appearance"}
                  </h1>
                </div>
                <UserRound className="h-5 w-5 text-[#BC7C10]" />
              </div>

              {tab === "contact" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Card name">
                    <input
                      className={fieldClass()}
                      value={profile.contact.cardName}
                      onChange={(e) =>
                        updateContact("cardName", e.target.value)
                      }
                      placeholder="Your name / brand"
                    />
                  </Field>
                  <Field label="Title / job">
                    <input
                      className={fieldClass()}
                      value={profile.contact.title}
                      onChange={(e) => updateContact("title", e.target.value)}
                      placeholder="Founder, Consultant…"
                    />
                  </Field>
                  <Field label="Business name" className="sm:col-span-2">
                    <input
                      className={fieldClass()}
                      value={profile.contact.businessName}
                      onChange={(e) =>
                        updateContact("businessName", e.target.value)
                      }
                      placeholder="Shown on card as Title - Business name"
                    />
                  </Field>

                  <div className="relative z-30 grid gap-4 sm:col-span-2 sm:grid-cols-2">
                    <PhoneNumberField
                      label="Mobile number"
                      value={normalizePhoneForInput(
                        profile.contact.mobile,
                        profile.contact.countryCode,
                      )}
                      defaultCountry={profile.contact.countryCode || "IN"}
                      placeholder="Mobile number"
                      onChange={(value) => updateContact("mobile", value)}
                      onCountryChange={(country) =>
                        updateContact("countryCode", country)
                      }
                    />
                    <PhoneNumberField
                      label="WhatsApp number"
                      value={normalizePhoneForInput(
                        profile.contact.whatsapp,
                        profile.contact.countryCode,
                      )}
                      defaultCountry={profile.contact.countryCode || "IN"}
                      placeholder="WhatsApp number"
                      onChange={(value) => updateContact("whatsapp", value)}
                    />
                  </div>

                  <Field label="Email address">
                    <input
                      type="email"
                      className={fieldClass()}
                      value={profile.contact.email}
                      onChange={(e) => updateContact("email", e.target.value)}
                      placeholder="you@company.com"
                    />
                  </Field>
                  <Field label="Website">
                    <input
                      className={fieldClass()}
                      value={profile.contact.website}
                      onChange={(e) => updateContact("website", e.target.value)}
                      placeholder="https://"
                    />
                  </Field>

                  <Field label="State">
                    <input
                      className={fieldClass()}
                      value={profile.contact.state}
                      onChange={(e) => updateContact("state", e.target.value)}
                      placeholder="State"
                    />
                  </Field>
                  <Field label="City">
                    <input
                      className={fieldClass()}
                      value={profile.contact.city}
                      onChange={(e) => updateContact("city", e.target.value)}
                      placeholder="City"
                    />
                  </Field>
                  <Field label="Address" className="sm:col-span-2">
                    <textarea
                      rows={3}
                      className={fieldClass()}
                      value={profile.contact.address}
                      onChange={(e) => updateContact("address", e.target.value)}
                      placeholder="Full address"
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <p className={labelClass()}>Brochure</p>
                    <div className="mt-1.5 rounded-xl border border-dashed border-black/15 bg-[#FAFAF8] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#141414]">
                            {profile.contact.brochureName ||
                              "Upload company brochure"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#8a8174]">
                            PDF, DOC, or image · Max 5 MB
                            {profile.contact.brochureSize
                              ? ` · ${formatFileSize(profile.contact.brochureSize)} used`
                              : ""}
                          </p>
                          {brochureError ? (
                            <p className="mt-1.5 text-[11px] font-medium text-[#E24C4C]">
                              {brochureError}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => brochureRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-[12px] font-semibold text-[#141414] hover:bg-white"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {profile.contact.brochureName ? "Replace" : "Upload"}
                          </button>
                          {profile.contact.brochureName ? (
                            <button
                              type="button"
                              onClick={() => void handleBrochureClear()}
                              className="rounded-lg px-3 py-2 text-[12px] font-semibold text-[#E24C4C] hover:bg-[#FFF5F5]"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <input
                        ref={brochureRef}
                        type="file"
                        accept=".pdf,.doc,.docx,image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          void handleBrochureUpload(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "social" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["facebook", "Facebook"],
                      ["instagram", "Instagram"],
                      ["linkedin", "LinkedIn"],
                      ["youtube", "YouTube"],
                      ["telegram", "Telegram"],
                      ["snapchat", "Snapchat"],
                      ["twitter", "X / Twitter"],
                      ["pinterest", "Pinterest"],
                      ["googleReview", "Google Review link"],
                      ["tripadvisor", "Tripadvisor"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <div className="relative">
                        <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
                        <input
                          className={`${fieldClass()} pl-9`}
                          value={profile.social[key]}
                          onChange={(e) => updateSocial(key, e.target.value)}
                          placeholder="https://"
                        />
                      </div>
                    </Field>
                  ))}
                </div>
              ) : null}

              {tab === "businessInfo" ? (
                <div className="space-y-5">
                  <Field label="About business">
                    <textarea
                      rows={5}
                      className={`${fieldClass()} max-w-full resize-y break-words [overflow-wrap:anywhere] whitespace-pre-wrap`}
                      value={profile.business.about}
                      onChange={(e) => updateBusinessAbout(e.target.value)}
                      placeholder="Save your contact by just tapping HexaCards digital business card. Describe your company here…"
                    />
                  </Field>

                  <div>
                    <div className="flex items-end justify-between gap-2">
                      <p className={labelClass()}>Service / product name</p>
                      <p className="text-[11px] text-[#8a8174]">
                        {Array.isArray(profile.business?.services)
                          ? profile.business.services.length
                          : 0}{" "}
                        added · no limit
                      </p>
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        className={`${fieldClass()} mt-0 flex-1`}
                        value={serviceInput}
                        onChange={(e) => setServiceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addService();
                          }
                        }}
                        placeholder="Enter Service / Product Name"
                      />
                      <button
                        type="button"
                        onClick={addService}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#141414] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2a2a2a]"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#8a8174]">
                      Add as many services as you need — there is no maximum.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-black/[0.08]">
                    <div className="max-h-[420px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-[#FAFAF8] text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
                        <tr>
                          <th className="px-4 py-3">Sr. No</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!(Array.isArray(profile.business?.services)
                          ? profile.business.services
                          : []
                        ).length ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-8 text-center text-xs text-[#8a8174]"
                            >
                              No services added yet. Add one above to show it in
                              Business Information.
                            </td>
                          </tr>
                        ) : (
                          (Array.isArray(profile.business?.services)
                            ? profile.business.services
                            : []
                          ).map((service, index) => (
                            <tr
                              key={`${service}-${index}`}
                              className="border-t border-black/[0.06]"
                            >
                              <td className="px-4 py-3 tabular-nums text-[#5c5346]">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3 font-medium text-[#141414]">
                                {service}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeService(index)}
                                  aria-label={`Delete ${service}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#E24C4C] hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "appearance" ? (
                <div className="space-y-7">
                  <div>
                    <p className={labelClass()}>Card layout</p>
                    <p className="mt-1 text-sm text-[#6b6560]">
                      Preview each layout on a phone. Tap a device to switch —
                      your card content stays the same.
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-10">
                      {CARD_LAYOUTS.map((layout) => {
                        const active =
                          (profile.appearance.layout ?? "classic") ===
                          layout.id;
                        const locked = !layout.available;
                        const previewName =
                          profile.contact.cardName.trim() || user.name;
                        const previewTitle =
                          [
                            profile.contact.title,
                            profile.contact.businessName,
                          ]
                            .filter(Boolean)
                            .join(" - ") || "Hexa NFC Business Card";

                        return (
                          <PhoneFrame
                            key={layout.id}
                            label={layout.label}
                            badge={
                              active ? "Active" : locked ? "Soon" : undefined
                            }
                            active={active}
                            locked={locked}
                            onClick={() => {
                              if (locked || active) return;
                              requestLayoutChange(layout.id);
                            }}
                          >
                            {locked ? (
                              <div className="flex h-full items-center justify-center bg-[#F3EEE6]">
                                <span className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
                                  Coming soon
                                </span>
                              </div>
                            ) : (
                              <LayoutPhonePreview
                                layoutId={layout.id}
                                name={previewName}
                                titleLine={previewTitle}
                                coverUrl={profile.appearance.coverImage}
                                avatarUrl={profile.appearance.logoImage}
                                accent={profile.appearance.accentColor}
                                mobile={profile.contact.mobile}
                                email={profile.contact.email}
                              />
                            )}
                          </PhoneFrame>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-start">
                    {/* Left — profile */}
                    <div className="flex flex-col items-center sm:items-start">
                      <p className={labelClass()}>Profile photo</p>
                      <div className="relative mt-3 h-[112px] w-[112px] overflow-hidden rounded-md shadow-[0_6px_20px_rgba(0,0,0,0.12)] ring-0.1 ring-[#141414] ring-offset-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            profile.appearance.logoImage || DEFAULT_CARD_AVATAR
                          }
                          alt=""
                          className="h-full w-full object-cover object-center"
                        />
                        <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
                          <label
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[#141414] shadow-md ring-1 ring-black/10 transition hover:bg-[#FFF8ED] hover:text-[#BC7C10]"
                            title="Edit photo"
                            aria-label="Edit profile photo"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                void openImageCrop(file, "profile");
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => requestDefaultImage("logo")}
                            disabled={isDefaultLogoImage(
                              profile.appearance.logoImage,
                            )}
                            title="Delete photo"
                            aria-label="Delete profile photo"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#E24C4C] shadow-md ring-1 ring-black/10 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-center text-[11px] text-[#8a8174] sm:text-left">
                        {isDefaultLogoImage(profile.appearance.logoImage)
                          ? "Using default"
                          : "Current photo"}
                      </p>
                    </div>

                    {/* Right — background */}
                    <div className="min-w-0">
                      <p className={labelClass()}>Card background</p>
                      <div className="relative mt-3 h-[112px] w-[212px] overflow-hidden rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.1)] ring-0.1 ring-[#141414] ring-offset-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            profile.appearance.coverImage || DEFAULT_CARD_BANNER
                          }
                          alt=""
                          className="h-full w-full object-cover object-center"
                        />
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 pt-8 pb-2.5 text-left text-[11px] font-semibold tracking-wide text-white uppercase">
                          {isDefaultCoverImage(profile.appearance.coverImage)
                            ? "Using default"
                            : "Current background"}
                        </span>
                        <div className="absolute right-1.5 bottom-1.5 z-10 flex items-center gap-1">
                          <label
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[#141414] shadow-md ring-1 ring-black/10 transition hover:bg-[#FFF8ED] hover:text-[#BC7C10]"
                            title="Edit background"
                            aria-label="Edit card background"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                void openImageCrop(file, "background");
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => requestDefaultImage("cover")}
                            disabled={isDefaultCoverImage(
                              profile.appearance.coverImage,
                            )}
                            title="Delete background"
                            aria-label="Delete card background"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#E24C4C] shadow-md ring-1 ring-black/10 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className={labelClass()}>Accent color</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {ACCENTS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateAppearance("accentColor", color)}
                          className={`h-9 w-9 rounded-full ring-2 ring-offset-2 ${
                            profile.appearance.accentColor.toLowerCase() ===
                            color.toLowerCase()
                              ? "ring-[#141414]"
                              : "ring-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Accent ${color}`}
                        />
                      ))}
                      <label
                        className={`relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-black/15 shadow-sm ring-2 ring-offset-2 ${
                          /^#[0-9A-Fa-f]{6}$/.test(
                            profile.appearance.accentColor,
                          ) &&
                          !(ACCENTS as readonly string[]).some(
                            (c) =>
                              c.toLowerCase() ===
                              profile.appearance.accentColor.toLowerCase(),
                          )
                            ? "ring-[#141414]"
                            : "ring-transparent"
                        }`}
                        title="Pick any color"
                      >
                        <span
                          className="pointer-events-none absolute inset-0 rounded-full"
                          style={multicolorWheelStyle()}
                          aria-hidden
                        />
                        <input
                          type="color"
                          value={
                            /^#[0-9A-Fa-f]{6}$/.test(
                              profile.appearance.accentColor,
                            )
                              ? profile.appearance.accentColor
                              : "#BC7C10"
                          }
                          onChange={(e) =>
                            updateAppearance("accentColor", e.target.value)
                          }
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          aria-label="Open color picker"
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-[#8a8174]">
                      Pick a preset, or click the color wheel for a custom
                      color.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-2 border-t border-black/[0.06] pt-5">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#BC7C10] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#9a650d]"
                >
                  <Check className="h-4 w-4" />
                  Update
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#141414] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#2a2a2a]"
                >
                  {tab === "appearance" ? "Save & finish" : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            <aside className="space-y-4 xl:sticky xl:top-[76px] xl:self-start">
              <div className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#8a8174] uppercase">
                  Your card URL
                </p>
                <p className="mt-2 break-all font-mono text-xs text-[#141414]">
                  {cardShareUrl}
                </p>
                <Link
                  href={cardSharePath}
                  target="_blank"
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#BC7C10] px-3 py-2.5 text-[13px] font-bold text-white hover:bg-[#9a650d]"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Open full card page
                </Link>
              </div>

              <div>
                <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-[#8a8174] uppercase">
                  Share card preview
                </p>
                <div className="mx-auto w-full max-w-[320px]">
                  <ProfileBanner
                    profile={profile}
                    userName={user.name}
                    slug={slug}
                    compact
                    onUploadProfile={(file) =>
                      void openImageCrop(file, "profile")
                    }
                    onUploadBackground={(file) =>
                      void openImageCrop(file, "background")
                    }
                  />
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {cropState ? (
        <ImageCropModal
          imageSrc={cropState.src}
          kind={cropState.kind}
          onCancel={() => setCropState(null)}
          onComplete={applyCroppedImage}
        />
      ) : null}

      {defaultConfirm ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="default-image-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2
              id="default-image-title"
              className="font-dashboard text-lg font-bold text-[#141414]"
            >
              Use default image?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6b6560]">
              {defaultConfirm === "cover"
                ? "Do you want to replace your card background with the default image?"
                : "Do you want to replace your profile photo with the default avatar?"}
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-[#FAFAF8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  defaultConfirm === "cover"
                    ? DEFAULT_CARD_BANNER
                    : DEFAULT_CARD_AVATAR
                }
                alt=""
                className={
                  defaultConfirm === "cover"
                    ? "aspect-[16/9] w-full object-cover"
                    : "mx-auto h-28 w-28 object-cover"
                }
              />
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDefaultConfirm(null)}
                className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-[13px] font-semibold text-[#141414] hover:bg-[#FAFAF8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyDefaultImage}
                className="flex-1 rounded-lg bg-[#BC7C10] px-3 py-2.5 text-[13px] font-bold text-white hover:bg-[#9a650d]"
              >
                Update image
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {layoutConfirm ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="layout-confirm-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2
              id="layout-confirm-title"
              className="font-dashboard text-lg font-bold text-[#141414]"
            >
              Change layout?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6b6560]">
              Are you sure you want to switch to the{" "}
              <span className="font-semibold text-[#141414]">
                {CARD_LAYOUTS.find((l) => l.id === layoutConfirm)?.label ??
                  layoutConfirm}
              </span>{" "}
              layout? Your photos, details, and accent color will stay the
              same. This is saved right away.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setLayoutConfirm(null)}
                className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-[13px] font-semibold text-[#141414] hover:bg-[#FAFAF8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyLayout}
                className="flex-1 rounded-lg bg-[#BC7C10] px-3 py-2.5 text-[13px] font-bold text-white hover:bg-[#9a650d]"
              >
                Change layout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={labelClass()}>{label}</span>
      {children}
    </label>
  );
}
