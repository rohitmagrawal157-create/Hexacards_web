"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type SearchableOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
};

const defaultTrigger =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#FFFCF7] px-4 py-3 text-left text-sm text-[#141414] transition-colors hover:border-[#BC7C10]/35 focus:border-[#BC7C10]/50 focus:bg-white focus:ring-2 focus:ring-[#BC7C10]/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

export default function SearchableSelect({
  id,
  label,
  required = false,
  disabled = false,
  loading = false,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  value,
  options,
  onChange,
  className = "",
  triggerClassName = defaultTrigger,
}: Props) {
  const autoId = useId();
  const fieldId = id || autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const t = window.setTimeout(() => searchRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, filtered.length]);

  function select(next: string) {
    onChange(next);
    setOpen(false);
  }

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) select(item.value);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <label
        htmlFor={fieldId}
        className="mb-2 block text-sm font-medium text-[#5c5346]"
      >
        {label}
        {required ? " *" : ""}
      </label>

      {/* Native input for HTML5 required / form submit */}
      <input
        id={fieldId}
        tabIndex={-1}
        aria-hidden
        required={required}
        value={value}
        onChange={() => {}}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />

      <button
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && !loading && setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className={triggerClassName}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selected ? "font-medium text-[#141414]" : "text-[#8a8174]"
          }`}
        >
          {loading
            ? "Loading…"
            : selected?.label || placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selected && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              className="rounded-md p-0.5 text-[#8a8174] hover:bg-black/[0.05] hover:text-[#141414]"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-[#8a8174] transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_12px_40px_rgba(20,20,20,0.14)] ring-1 ring-black/[0.03]"
          role="listbox"
        >
          <div className="border-b border-black/[0.06] bg-[#FFFCF7] p-2">
            <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5 py-2 focus-within:border-[#BC7C10]/45 focus-within:ring-2 focus-within:ring-[#BC7C10]/15">
              <Search className="h-4 w-4 shrink-0 text-[#8a8174]" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onSearchKey}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-[#141414] outline-none placeholder:text-[#9a9a9a]"
              />
              {query ? (
                <button
                  type="button"
                  className="rounded p-0.5 text-[#8a8174] hover:text-[#141414]"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[#8a8174]">
                {emptyText}
              </p>
            ) : (
              filtered.map((opt, index) => {
                const isSelected = opt.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(opt.value)}
                    className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm transition-colors ${
                      isActive ? "bg-[#FFF8ED]" : "bg-white"
                    } ${isSelected ? "font-semibold text-[#BC7C10]" : "text-[#141414]"}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-[#BC7C10]" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-black/[0.06] bg-[#FAFAF8] px-3 py-1.5 text-[10px] font-medium tracking-wide text-[#8a8174] uppercase">
            {filtered.length} of {options.length}
          </div>
        </div>
      ) : null}
    </div>
  );
}
