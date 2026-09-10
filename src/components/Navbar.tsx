"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ChevronDown,
  ClipboardList,
  LogIn,
  LogOut,
  Menu,
  Sparkles,
  UserCircle2,
  UserRound,
  X,
} from "lucide-react";
import { OrderHistoryModal } from "@/src/components/OrderHistoryModal";
import { supabase } from "@/src/lib/supabase/client";
import { normalizeXAvatarUrl } from "@/src/lib/supabase/profile-sync";

type ProfileRoleRow = {
  role?: string | null;
};

function normalizeRole(value?: string | null) {
  if (!value) return "CLIENT";
  const normalized = value.toUpperCase();
  if (normalized === "ARTIST" || normalized === "ADMIN" || normalized === "CLIENT") {
    return normalized;
  }
  return "CLIENT";
}

export function Navbar() {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(supabase !== null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const protectedNavPaths = new Set(["/characters", "/characters/create", "/orders"]);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    const syncUser = async () => {
      try {
        const {
          data: { session },
          error,
        } = await client.auth.getSession();

        if (error) {
          const msg = error.message ?? "";
          const isGuestState = /auth session missing|session missing|not authenticated/i.test(msg);

          if (!isGuestState) {
            console.warn("Failed to read auth session:", msg);
          }

          setUser(null);
          setRole(null);
          setIsLoading(false);
          return;
        }

        const nextUser = session?.user ?? null;

        setUser(nextUser);
        if (nextUser) {
          console.log("Checking profile for user:", nextUser.id);

          const { data: existingProfile, error: profileError } = await client
            .from("profiles")
            .select("role")
            .eq("id", nextUser.id)
            .single();

          console.log("Existing profile result:", existingProfile, "Error:", profileError);

          if (profileError) {
            if (profileError.code !== "PGRST116") {
              console.warn("Failed to read profile role during session load:", profileError.message);
            }

            setRole(null);
          } else {
            setRole((existingProfile?.role as string | null | undefined) ?? null);
          }
        } else {
          setRole(null);
        }
        setIsLoading(false);
      } catch {
        setUser(null);
        setRole(null);
        setIsLoading(false);
      }
    };

    void syncUser();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setIsLoading(false);

      if (event === "SIGNED_OUT" || !nextUser) {
        setRole(null);
        setIsMobileMenuOpen(false);
        return;
      }

      if (event === "SIGNED_IN" && nextUser) {
        console.log("Checking profile for user:", nextUser.id);

        void (async () => {
          const { data: existingProfile, error: profileError } = await client
            .from("profiles")
            .select("role")
            .eq("id", nextUser.id)
            .single();

          console.log("Existing profile result:", existingProfile, "Error:", profileError);

          if (profileError) {
            if (profileError.code !== "PGRST116") {
              console.warn("Failed to read profile role during sign-in:", profileError.message);
            }

            setRole(null);
            return;
          }

          setRole((existingProfile?.role as string | null | undefined) ?? null);
        })();
      }
    });

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadRole = async () => {
      const client = supabase;
      if (!client) {
        return;
      }

      try {
        const { data: prof } = await client
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle<ProfileRoleRow>();

        const profileRole = (prof?.role as string | null | undefined) ?? user.user_metadata?.role ?? "CLIENT";
        setRole(normalizeRole(profileRole));
      } catch (e) {
        console.warn("failed to fetch profile role", e);
        setRole(normalizeRole(user.user_metadata?.role ?? "CLIENT"));
      }
    };

    void loadRole();
  }, [user]);

  const handleLogout = async () => {
    if (!supabase) {
      console.warn("Supabase 尚未設定，無法登出。");
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      console.warn(error.message);
      return;
    }

    setUser(null);
    setIsMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleOrderQuery = () => {
    if (!user) {
      window.location.href = "/login?redirectTo=%2Forders";
      return;
    }

    setIsOrderModalOpen(true);
    setIsMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleNavLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    if (!protectedNavPaths.has(href)) {
      return;
    }

    if (isLoading) {
      event.preventDefault();
      return;
    }

    if (!user) {
      event.preventDefault();
      window.location.href = `/login?redirectTo=${encodeURIComponent(href)}`;
      return;
    }

    setIsMobileMenuOpen(false);
  };

  const rawAvatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const provider = String(user?.app_metadata?.provider ?? "").toLowerCase();
  const avatarUrl = provider === "x" ? normalizeXAvatarUrl(rawAvatarUrl) ?? undefined : rawAvatarUrl;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.preferred_username as string | undefined) ??
    (user?.user_metadata?.user_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Guest";
  const normalizedRole = normalizeRole(role);
  const navItems = [
    { label: "訂製流程", href: "/#process" },
    { label: "創建角色", href: "/characters/create" },
    { label: "我的角色", href: "/characters" },
    { label: "周邊購買", href: "/shop" },
    { label: "合作繪師", href: "/artists" },
    { label: "訂單查詢", href: "/orders" },
  ] as const;

  return (
    <>
      <OrderHistoryModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} />

      <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 shadow-lg shadow-sky-200">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">TONE</span>
          </Link>

          <nav className="hidden items-center gap-2 text-sm font-medium text-slate-700 md:flex lg:gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => handleNavLinkClick(event, item.href)}
                className="rounded-lg px-4 py-2 transition-colors duration-200 hover:bg-sky-50 hover:text-sky-600"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:gap-3 md:flex">
            {isLoading ? (
              <div className="h-10 w-32 animate-pulse rounded-full bg-sky-100" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((current) => !current)}
                  className="flex items-center gap-2 rounded-full border border-sky-200 bg-white px-2 py-1.5 shadow-sm transition hover:border-sky-300"
                >
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-sky-200 bg-sky-50">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 className="h-5 w-5 text-sky-600" />
                    )}
                  </div>

                  <span className="hidden text-sm font-medium text-slate-700 sm:block">{displayName}</span>
                  {role ? (
                    <span className="ml-2 hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 sm:inline-block">
                      {role[0].toUpperCase() + role.slice(1)}
                    </span>
                  ) : null}
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>

                {isMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] w-60 overflow-hidden rounded-2xl border border-sky-100 bg-white p-2 shadow-xl shadow-sky-100">
                    {normalizedRole === "ARTIST" || normalizedRole === "ADMIN" ? (
                      <Link
                        href="/artist/dashboard"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <UserRound className="h-4 w-4" />
                        繪師後台
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleOrderQuery}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-sky-50"
                    >
                      <ClipboardList className="h-4 w-4" />
                      訂單查詢
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-left text-sm font-medium text-white transition hover:bg-slate-700"
                    >
                      <LogOut className="h-4 w-4" />
                      登出
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-white px-4 py-2.5 text-sm font-semibold text-sky-600 shadow-sm transition hover:bg-sky-50 hover:shadow-md"
              >
                <LogIn className="h-4 w-4" />
                登入
              </Link>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-white text-slate-700 shadow-sm transition hover:bg-sky-50 md:hidden"
            aria-label="開啟選單"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="關閉選單"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <aside className="absolute right-0 top-0 flex h-full w-[84%] max-w-xs flex-col border-l border-sky-100 bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wide text-slate-700">選單</span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                aria-label="關閉選單"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(event) => handleNavLinkClick(event, item.href)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-sky-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 border-t border-slate-200 pt-4">
              {isLoading ? (
                <div className="h-10 w-full animate-pulse rounded-xl bg-sky-100" />
              ) : user ? (
                <div className="space-y-2">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-sky-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UserCircle2 className="h-4 w-4" />
                    個人資料
                  </Link>

                  {(normalizedRole === "ARTIST" || normalizedRole === "ADMIN") && (
                    <Link
                      href="/artist/dashboard"
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <UserRound className="h-4 w-4" />
                      繪師後台
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-left text-sm font-medium text-white transition hover:bg-slate-700"
                  >
                    <LogOut className="h-4 w-4" />
                    登出
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 py-2.5 text-sm font-semibold text-sky-600 shadow-sm transition hover:bg-sky-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LogIn className="h-4 w-4" />
                  登入
                </Link>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
