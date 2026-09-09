"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, FileImage, Loader2, LogIn, ShieldAlert, ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type AccessState = "loading" | "guest" | "forbidden" | "admin";
type OrderStatus = "pending" | "approved" | "rejected" | "completed";

type OrderRow = {
  id: string;
  user_id?: string | null;
  character_name: string;
  personality: string;
  appearance_description: string;
  body_size: string;
  hair_color: string;
  eye_color: string;
  notes: string | null;
  status: OrderStatus;
  created_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
};

type ProfileRow = {
  role?: string | null;
  full_name?: string | null;
  email?: string | null;
};

const statusMap: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "待處理", color: "bg-amber-500/15 text-amber-200 border-amber-500/30" },
  approved: { label: "已批准", color: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" },
  rejected: { label: "已拒絕", color: "bg-rose-500/15 text-rose-200 border-rose-500/30" },
  completed: { label: "已完成", color: "bg-cyan-500/15 text-cyan-200 border-cyan-500/30" },
};

const normalizeRole = (value: unknown) => {
  if (typeof value !== "string") return null;
  return value.trim().toUpperCase();
};

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase 尚未設定，請先在 .env.local 中加入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
      return;
    }

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined;

    const { error: signInError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (signInError) {
      setError(signInError.message);
    }
  };

  const loadAccess = useCallback(async () => {
    setAccessState("loading");
    setError(null);

    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase 尚未設定，請先在 .env.local 中加入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
      setAccessState("forbidden");
      return;
    }

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      setAccessState("guest");
      return;
    }

    const { data: profileData, error: profileError } = await client
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const rawRole = (profileData as ProfileRow | null)?.role ?? null;
    const role = normalizeRole(rawRole);

    console.log("[AdminPage] access check", {
      userId: user.id,
      rawRole,
      normalizedRole: role,
      profileError: profileError ? profileError.message : null,
    });

    if (profileError) {
      console.log("[AdminPage] profile fetch failed", profileError);
      setError(profileError.message);
      setAccessState("forbidden");
      return;
    }

    if (role === "ARTIST") {
      setAccessState("loading");
      router.replace("/artist/dashboard");
      return;
    }

    if (role !== "ADMIN") {
      console.log("[AdminPage] access denied for non-admin role", {
        userId: user.id,
        rawRole,
        normalizedRole: role,
      });
      setAccessState("forbidden");
      return;
    }

    setProfile((profileData as ProfileRow | null) ?? null);
    setAccessState("admin");

    const { data, error: queryError } = await client.from("orders").select("*").order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      return;
    }

    setOrders((data as OrderRow[]) ?? []);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    const client = getSupabaseClient();
    if (!client) {
      return () => window.clearTimeout(timer);
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      void loadAccess();
    });

    return () => {
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [loadAccess]);

  const totalAmount = useMemo(() => orders.length, [orders]);

  const updateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    const client = getSupabaseClient();
    if (!client) {
      console.warn("Supabase 尚未設定，無法更新狀態。");
      return;
    }

    const { error } = await client.from("orders").update({ status: nextStatus }).eq("id", orderId);

    if (error) {
      setError(error.message);
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: nextStatus,
            }
          : order,
      ),
    );
  };

  if (accessState === "loading") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.2),_transparent_22%),linear-gradient(180deg,#070b16_0%,#0f172a_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-white/10 bg-slate-900/70">
            <div className="flex items-center gap-3 text-slate-200">
              <Loader2 className="h-5 w-5 animate-spin" />
              正在確認登入狀態與權限...
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (accessState === "guest") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.2),_transparent_22%),linear-gradient(180deg,#070b16_0%,#0f172a_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center shadow-2xl shadow-red-950/20">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
              <ShieldAlert className="h-7 w-7 text-red-200" />
            </div>
            <h1 className="text-2xl font-black text-white">請先登入</h1>
            <p className="mt-3 text-sm leading-7 text-red-100">請先登入才能進入訂單管理後台。</p>
            <button
              type="button"
              onClick={handleLogin}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:translate-y-[-1px]"
            >
              <LogIn className="h-4 w-4" />
              立即登入
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (accessState === "forbidden") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.2),_transparent_22%),linear-gradient(180deg,#070b16_0%,#0f172a_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-center shadow-2xl shadow-amber-950/20">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
              <ShieldCheck className="h-7 w-7 text-amber-200" />
            </div>
            <h1 className="text-2xl font-black text-white">權限不足</h1>
            <p className="mt-3 text-sm leading-7 text-amber-100">此頁面僅限繪師與管理者存取。</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首頁
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.2),_transparent_22%),linear-gradient(180deg,#070b16_0%,#0f172a_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-pink-200 transition hover:text-pink-100">
              <ArrowLeft className="h-4 w-4" />
              返回首頁
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-white">平台管理後台</h1>
            <p className="mt-2 text-sm text-slate-300">管理者：{profile?.full_name ?? profile?.email ?? "平台管理員"}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">總訂單數</p>
            <p className="text-2xl font-black text-white">{totalAmount}</p>
          </div>
        </div>

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">
            <ShieldAlert className="mt-0.5 h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">待處理</p>
            <p className="mt-3 text-3xl font-black text-amber-300">{orders.filter((item) => item.status === "pending").length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">已完成</p>
            <p className="mt-3 text-3xl font-black text-emerald-300">{orders.filter((item) => item.status === "completed").length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">平台總數</p>
            <p className="mt-3 text-3xl font-black text-pink-300">{orders.length}</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/70 p-12 text-center text-slate-300">
            <Clock3 className="mx-auto mb-3 h-8 w-8 text-pink-300" />
            <p className="text-lg font-semibold text-white">目前還沒有訂單資料</p>
            <p className="mt-2 text-sm text-slate-400">所有平台訂單會顯示在這裡。</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {orders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-pink-500/5">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">訂單編號</p>
                    <h2 className="mt-2 text-xl font-bold text-white">{order.character_name}</h2>
                  </div>

                  <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${statusMap[order.status].color}`}>
                    {statusMap[order.status].label}
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4 text-sm text-slate-200">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">體型</p>
                        <p className="mt-2 font-medium text-white">{order.body_size}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">建立時間</p>
                        <p className="mt-2 font-medium text-white">
                          {new Date(order.created_at).toLocaleString("zh-TW")}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">個性</p>
                      <p className="mt-2 text-white">{order.personality}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">外觀描述</p>
                      <p className="mt-2 leading-7 text-slate-200">{order.appearance_description}</p>
                    </div>

                    {order.notes ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">其他備註</p>
                        <p className="mt-2 leading-7 text-slate-200">{order.notes}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">髮色</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="h-8 w-8 rounded-full border border-white/20" style={{ backgroundColor: order.hair_color }} />
                        <span className="font-mono text-sm text-white">{order.hair_color}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">眼睛顏色</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="h-8 w-8 rounded-full border border-white/20" style={{ backgroundColor: order.eye_color }} />
                        <span className="font-mono text-sm text-white">{order.eye_color}</span>
                      </div>
                    </div>

                    {order.attachment_url ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">參考圖片</p>
                        <a
                          href={order.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-sm text-pink-100"
                        >
                          <FileImage className="h-4 w-4" />
                          {order.attachment_name ?? "查看附件"}
                        </a>
                      </div>
                    ) : null}

                    <div className="pt-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">更新狀態</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["pending", "approved", "rejected", "completed"] as OrderStatus[]).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => void updateStatus(order.id, status)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              order.status === status
                                ? "border-pink-400 bg-pink-500/20 text-pink-100"
                                : "border-white/10 bg-slate-800 text-slate-200 hover:border-pink-500/30"
                            }`}
                          >
                            {statusMap[status].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}


