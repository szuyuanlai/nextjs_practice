"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Globe, LogOut, Sparkles, UserCircle2 } from "lucide-react";
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

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-400 shadow-lg shadow-pink-500/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">szuyuanlai</span>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-200 md:flex">
          <a href="#plans" className="transition hover:text-pink-300">
            服務方案
          </a>
          <a href="#gallery" className="transition hover:text-pink-300">
            角色藝廊
          </a>
          <a href="#process" className="transition hover:text-pink-300">
            訂製流程
          </a>
          <a href="#faq" className="transition hover:text-pink-300">
            常見問題
          </a>
          {user ? (
            <Link href="/admin" className="transition hover:text-pink-300">
              訂單管理
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-10 w-32 animate-pulse rounded-full bg-white/5" />
          ) : user ? (
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-1.5">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-pink-400/30 bg-slate-800">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle2 className="h-5 w-5 text-pink-200" />
                )}
              </div>

              <span className="hidden text-sm font-medium text-white sm:block">{displayName}</span>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-pink-400/40 hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">登出</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:brightness-110"
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
