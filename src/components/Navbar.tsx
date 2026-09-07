"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ChevronDown,
  ClipboardList,
  Globe,
  LogOut,
  Sparkles,
  UserCircle2,
  UserRound,
} from "lucide-react";
import { OrderHistoryModal } from "@/src/components/OrderHistoryModal";
import { supabase } from "@/src/lib/supabase/client";

export function Navbar() {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setIsLoading(false);
      return;
    }

    const syncUser = async () => {
      const {
        data: { user: authUser },
        error,
      } = await client.auth.getUser();

      if (error) {
        console.error("Failed to fetch user:", error.message);
        setUser(null);
        setIsLoading(false);
        return;
      }

      setUser(authUser);
      setIsLoading(false);
    };

    void syncUser();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
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

  const handleLogin = async () => {
    if (!supabase) {
      alert("Supabase 尚未設定，請先填入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
      return;
    }

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error("Login failed:", error.message);
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    if (!supabase) {
      alert("Supabase 尚未設定，無法登出。");
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      alert(error.message);
      return;
    }

    setUser(null);
    setIsMenuOpen(false);
  };

  const handleOrderQuery = async () => {
    if (!user) {
      const confirmed = window.confirm("請先登入後再查詢訂單。是否立即使用 Google 登入？");
      if (confirmed) {
        await handleLogin();
      }
      return;
    }

    setIsOrderModalOpen(true);
    setIsMenuOpen(false);
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Guest";

  return (
    <>
      <OrderHistoryModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} />

      <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 shadow-lg shadow-sky-200">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">szuyuanlai</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#plans" className="transition hover:text-sky-700">
              服務方案
            </a>
            <a href="#process" className="transition hover:text-sky-700">
              訂製流程
            </a>
            <a href="#artists" className="transition hover:text-sky-700">
              聯名畫師
            </a>
            <button type="button" onClick={handleOrderQuery} className="transition hover:text-sky-700">
              訂單查詢
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
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
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>

                {isMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] w-52 overflow-hidden rounded-2xl border border-sky-100 bg-white p-2 shadow-xl shadow-sky-100">
                    <Link
                      href="/account"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <UserRound className="h-4 w-4" />
                      帳號資訊
                    </Link>

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
                      Sign Out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:translate-y-[-1px]"
              >
                <Globe className="h-4 w-4" />
                使用 Google 登入
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
