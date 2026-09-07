"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Globe, LogOut, Sparkles, UserCircle2, ClipboardList, UserRound } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    if (!supabase) {
      alert("Supabase 尚未設定，請先填入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。 ");
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
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Guest";

  return (
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
          <a href="#orders" className="transition hover:text-sky-700">
            訂單查詢
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isLoading ? (
            <div className="h-10 w-32 animate-pulse rounded-full bg-sky-100" />
          ) : user ? (
            <>
              <Link
                href="/orders"
                className="hidden items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 sm:inline-flex"
              >
                <ClipboardList className="h-4 w-4" />
                訂單
              </Link>

              <Link
                href="/account"
                className="hidden items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 sm:inline-flex"
              >
                <UserRound className="h-4 w-4" />
                帳號
              </Link>

              <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-white px-2 py-1.5 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-sky-200 bg-sky-50">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle2 className="h-5 w-5 text-sky-600" />
                  )}
                </div>

                <span className="hidden text-sm font-medium text-slate-700 sm:block">{displayName}</span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-2.5 py-2 text-xs font-medium text-white transition hover:bg-slate-700 sm:px-3"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">登出</span>
                </button>
              </div>
            </>
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
  );
}
