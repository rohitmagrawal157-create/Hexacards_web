"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { navLinks } from "./data";
import { clearAuthUser, getAuthUser, type HexaAuthUser } from "@/lib/auth";

function linkIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [user, setUser] = useState<HexaAuthUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sync = () => setUser(getAuthUser());
    sync();
    window.addEventListener("hexa-auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("hexa-auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [pathname]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!userMenuRef.current) return;
      const target = e.target as Node;
      if (userMenuRef.current.contains(target)) return;
      setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function signOut() {
    clearAuthUser();
    setUser(null);
    setOpen(false);
    setUserMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md">
      <div className="px-4 pt-3 pb-2 sm:px-6 lg:px-8">
        {/* Pill bar — medium height */}
        <div className="nav-pill mx-auto grid w-full max-w-[1280px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-full border border-[#e8e8e8] bg-white py-2.5 pr-3 pl-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:gap-4 sm:py-3 sm:pr-4 sm:pl-5 lg:pr-5 lg:pl-6">
          {/* Left: logo → home */}
          <Link
            href="/"
            className="relative h-12 w-[170px] shrink-0 sm:h-14 sm:w-[210px] lg:h-[56px] lg:w-[230px]"
            aria-label="HexaCards home"
          >
            <Image
              src="/Images/Hexacards.png"
              alt="HexaCards"
              fill
              priority
              quality={100}
              sizes="(max-width: 640px) 170px, (max-width: 1024px) 210px, 230px"
              className="object-contain object-left"
            />
          </Link>

          {/* Center: links */}
          <nav
            className="hidden min-w-0 items-center justify-center overflow-visible lg:flex"
            aria-label="Primary"
          >
            <ul className="flex flex-nowrap items-center justify-center gap-0.5 xl:gap-1">
              {navLinks.map((link) => {
                const hasDropdown = Boolean(link.children?.length);
                const isOpen = activeDropdown === link.label;
                const isActive =
                  linkIsActive(pathname, link.href) ||
                  Boolean(
                    link.children?.some((child) =>
                      linkIsActive(pathname, child.href),
                    ),
                  );
                return (
                  <li
                    key={link.label}
                    className="relative shrink-0"
                    onMouseEnter={() =>
                      hasDropdown ? setActiveDropdown(link.label) : undefined
                    }
                    onMouseLeave={() =>
                      hasDropdown ? setActiveDropdown(null) : undefined
                    }
                  >
                    <Link
                      href={link.href}
                      className={`group flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-semibold transition-colors duration-200 xl:px-3.5 xl:text-base ${
                        isActive
                          ? "text-[#BC7C10]"
                          : "text-[#141414] hover:text-[#BC7C10]"
                      }`}
                    >
                      {link.label}
                      {hasDropdown ? (
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-[#666] transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          strokeWidth={2}
                        />
                      ) : null}
                    </Link>

                    {hasDropdown ? (
                      <div
                        className={`absolute top-full left-1/2 z-50 -translate-x-1/2 pt-2 transition-all duration-200 ease-out ${
                          isOpen
                            ? "pointer-events-auto translate-y-0 opacity-100"
                            : "pointer-events-none -translate-y-1 opacity-0"
                        }`}
                      >
                        <ul className="min-w-[200px] rounded-2xl border border-[#e8e8e8] bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
                          {link.children!.map((child) => {
                            const childActive = linkIsActive(
                              pathname,
                              child.href,
                            );
                            return (
                              <li key={child.href + child.label}>
                                <Link
                                  href={child.href}
                                  className={`block rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                                    childActive
                                      ? "bg-[#FFF8ED] text-[#BC7C10]"
                                      : "text-[#333]"
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right: sign in (desktop) / menu (mobile) */}
          <div className="flex shrink-0 items-center justify-self-end gap-2 sm:gap-2.5">
            {user ? (
              <div ref={userMenuRef} className="relative hidden items-center gap-1.5 lg:flex">
                <span className="max-w-[140px] truncate rounded-full bg-[#FFF8ED] px-3 py-2 text-xs font-bold text-[#BC7C10]">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="User menu"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#1a1a1a] transition-colors hover:bg-black/[0.04]"
                >
                  <UserRound className="h-4 w-4" />
                </button>

                {userMenuOpen ? (
                  <div
                    role="menu"
                    aria-label="User menu"
                    className="absolute top-full right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_14px_50px_rgba(0,0,0,0.12)]"
                  >
                    <Link
                      href="/dashboard"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-semibold text-[#141414] hover:bg-[#FFF8ED]"
                    >
                      User dashboard
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={signOut}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-[#141414] hover:bg-[#FFF8ED]"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden shrink-0 items-center justify-center rounded-full bg-[#111] px-5 py-2.5 text-[15px] font-semibold whitespace-nowrap text-white transition-colors duration-200 hover:bg-[#222] active:scale-[0.98] lg:inline-flex"
              >
                Sign In
              </Link>
            )}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center text-[#1a1a1a] lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="sr-only">Menu</span>
              <span className="flex w-5 flex-col gap-1.5" aria-hidden>
                <span
                  className={`h-0.5 w-full bg-current transition-transform duration-300 ${open ? "translate-y-2 rotate-45" : ""}`}
                />
                <span
                  className={`h-0.5 w-full bg-current transition-opacity duration-300 ${open ? "opacity-0" : ""}`}
                />
                <span
                  className={`h-0.5 w-full bg-current transition-transform duration-300 ${open ? "-translate-y-2 -rotate-45" : ""}`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <nav
          id="mobile-nav"
          className={`mx-auto max-w-[1180px] overflow-hidden transition-all duration-300 ease-out lg:hidden ${
            open
              ? "mt-2 max-h-[70vh] opacity-100"
              : "pointer-events-none mt-0 max-h-0 opacity-0"
          }`}
          aria-label="Mobile"
          aria-hidden={!open}
        >
          <ul className="rounded-3xl border border-[#e8e8e8] bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
            {navLinks.map((link) => {
              const hasDropdown = Boolean(link.children?.length);
              return (
                <li key={link.label}>
                  {hasDropdown ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-left text-base font-semibold text-[#141414]"
                        aria-expanded={mobileExpanded === link.label}
                        onClick={() =>
                          setMobileExpanded((current) =>
                            current === link.label ? null : link.label,
                          )
                        }
                      >
                        {link.label}
                        <ChevronDown
                          className={`h-4 w-4 text-[#666] transition-transform duration-300 ${
                            mobileExpanded === link.label ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      <ul
                        className={`overflow-hidden border-l border-black/10 pl-3 transition-all duration-300 ${
                          mobileExpanded === link.label
                            ? "mb-2 max-h-60 opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        {link.children!.map((child) => (
                          <li key={child.href + child.label}>
                            <Link
                              href={child.href}
                              className="block rounded-lg px-3 py-2.5 text-[15px] text-[#555]"
                              onClick={() => setOpen(false)}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <Link
                      href={link.href}
                      className="block rounded-xl px-3 py-3.5 text-base font-semibold text-[#141414]"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              );
            })}
            <li className="mt-3 border-t border-[#e8e8e8] pt-3">
              {user ? (
                <div className="space-y-2">
                  <p className="px-3 text-sm font-bold text-[#BC7C10]">
                    {user.name}
                  </p>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center rounded-full bg-[#FFF8ED] px-5 py-3 text-base font-semibold text-[#BC7C10] transition-colors hover:bg-[#FFF3DF]"
                  >
                    User dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 px-5 py-3 text-base font-semibold text-[#141414]"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center rounded-full bg-[#111] px-5 py-3 text-base font-semibold text-white"
                  onClick={() => setOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
