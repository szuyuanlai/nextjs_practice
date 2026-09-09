"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, LogIn, ShieldAlert } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type AdminProfile = {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const client = getSupabaseClient();
      if (!client) {
        setError("Supabase 尚未設定，請先在 .env.local 中加入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await client.auth.getUser();

      if (authError || !user) {
        setError("請先登入才能進入管理後台。");
        setLoading(false);
        return;
      }

      const { data: prof, error: profileError } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const role = (prof as AdminProfile | null)?.role ?? null;

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (role === "artist") {
        router.replace("/artist/dashboard");
        return;
      }

      if (role !== "admin") {
        setError("權限不足，此頁面僅限管理者存取。");
        setLoading(false);
        return;
      }

      setProfile(prof);
      setLoading(false);
    };

    void load();
  }, [router]);

  const handleLogin = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase 尚未設定，請先在 .env.local 中加入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
      return;
    }

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/admin/dashboard` : undefined;

    const { error: signInError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (signInError) {
      setError(signInError.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="flex items-center gap-3 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          正在檢查管理員權限...
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="max-w-lg rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
            <ShieldAlert className="h-7 w-7 text-red-200" />
          </div>
          <h1 className="text-2xl font-black">{error.includes("登入") ? "請先登入" : "權限不足"}</h1>
          <p className="mt-3 text-sm leading-7 text-red-100">{error}</p>
          {error.includes("登入") ? (
            <button
              type="button"
              onClick={handleLogin}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/20"
            >
              <LogIn className="h-4 w-4" />
              立即登入
            </button>
          ) : (
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首頁
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-bold">管理後台</h1>
      <div className="mb-4">管理員：{profile?.full_name ?? profile?.id}</div>
      <div className="grid gap-3">
        <a href="/admin/users" className="rounded border px-3 py-2">使用者管理</a>
        <a href="/admin/orders" className="rounded border px-3 py-2">訂單管理</a>
        <a href="/admin/live2d" className="rounded border px-3 py-2">Live2D 管理</a>
      </div>
    </div>
  );
}
