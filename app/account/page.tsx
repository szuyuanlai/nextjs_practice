"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Briefcase, Loader2, Mail, ShieldCheck, UserCircle2 } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

type ProfileRow = {
  role?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncUser = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsLoading(false);
        return;
      }

      setUser(data.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, full_name, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

      const nextProfile = (profileData as ProfileRow | null) ?? null;
      setProfile(nextProfile);
      setRole(nextProfile?.role ?? "customer");
      setIsLoading(false);
    };

    void syncUser();
  }, []);

  const avatarUrl = (profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined)) ?? undefined;
  const displayName =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "使用者";

  const roleLabel = role === "artist" ? "繪師" : role === "admin" ? "管理者" : "會員";

  const quickLinks = [
    { label: "查看訂單", href: "/orders" },
    { label: "繪師後台", href: "/artist/dashboard", show: role === "artist" || role === "admin" },
    { label: "編輯個人檔案", href: "/artist/profile", show: role === "artist" || role === "admin" },
    { label: "管理後台", href: "/admin", show: role === "admin" },
  ].filter((link) => link.show !== false);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-[30px] border border-sky-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              載入帳號資訊中...
            </div>
          </div>
        ) : !user ? (
          <div className="rounded-[30px] border border-sky-100 bg-white p-10 text-center shadow-sm">
            <UserCircle2 className="mx-auto mb-4 h-12 w-12 text-sky-500" />
            <h1 className="text-2xl font-black text-slate-900">尚未登入</h1>
            <p className="mt-3 text-slate-600">請先使用 Google 登入，才可查看帳號與訂單資料。</p>
            <Link href="/" className="mt-6 inline-flex rounded-full bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700">
              回首頁登入
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-sky-200 bg-sky-50">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle2 className="h-8 w-8 text-sky-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{roleLabel}</p>
                  <h1 className="text-2xl font-black text-slate-900">{displayName}</h1>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                <div className="flex items-center gap-3 text-slate-700">
                  <Mail className="h-4 w-4 text-sky-600" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Google 帳號已驗證</span>
                </div>
              </div>
            </aside>

            <section className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-900">帳號概覽</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">登入方式</p>
                  <p className="mt-3 text-xl font-black text-slate-900">Google</p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">角色</p>
                  <p className="mt-3 text-xl font-black text-slate-900">{roleLabel}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-sky-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Briefcase className="h-4 w-4 text-sky-600" />
                  快速連結
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-full bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-700"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link href="/" className="rounded-full border border-sky-200 bg-white px-4 py-2.5 font-semibold text-sky-700 hover:bg-sky-50">
                    回首頁
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
