"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, Loader2, ShieldAlert } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type CharacterStatus = "draft" | "in_progress" | "completed" | string;

type CharacterOrderRow = {
  id: string;
  user_id: string;
  artist_id: string | null;
  name: string;
  status: CharacterStatus | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
};

type EnrichedCharacterOrder = CharacterOrderRow & {
  clientName: string;
};

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(status: string | null) {
  if (status === "completed") {
    return "completed";
  }
  if (status === "in_progress") {
    return "in_progress";
  }
  return "draft";
}

function getStatusConfig(status: string | null) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "completed") {
    return {
      label: "已完成",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (normalizedStatus === "in_progress") {
    return {
      label: "繪製中",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  return {
    label: "待接單",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

export default function ArtistOrdersListView() {
  const router = useRouter();
  const [orders, setOrders] = useState<EnrichedCharacterOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) {
        if (!cancelled) {
          setErrorMessage("Supabase 尚未設定，無法讀取繪師委託訂單。");
          setIsLoading(false);
        }
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (authError || !user) {
        router.replace("/login?redirectTo=%2Fartist%2Forders");
        return;
      }

      const { data, error } = await supabase
        .from("characters")
        .select("id,user_id,artist_id,name,status,created_at")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (error) {
        setErrorMessage(`讀取委託訂單失敗：${error.message}`);
        setIsLoading(false);
        return;
      }

      const rows = (data ?? []) as CharacterOrderRow[];
      const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
      const profileMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,full_name,display_name")
          .in("id", userIds);

        for (const profile of (profiles ?? []) as ProfileRow[]) {
          profileMap.set(profile.id, profile.display_name ?? profile.full_name ?? "未命名客戶");
        }
      }

      if (cancelled) {
        return;
      }

      setOrders(
        rows.map((row) => ({
          ...row,
          clientName: profileMap.get(row.user_id) ?? "未命名客戶",
        })),
      );
      setIsLoading(false);
    };

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const completedCount = useMemo(
    () => orders.filter((order) => normalizeStatus(order.status) === "completed").length,
    [orders],
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <section className="mb-8 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            <ClipboardList className="h-3.5 w-3.5" />
            Artist Orders
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">客戶委託訂單</h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                僅顯示已指派給你的角色委託。你可以查看需求內容、參考圖與最終交稿狀態。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">總委託</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{orders.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">已完成</p>
                <p className="mt-1 text-2xl font-black text-emerald-700">{completedCount}</p>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <ShieldAlert className="mt-0.5 h-5 w-5" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-[30px] border border-sky-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              載入委託訂單中...
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-sky-200 bg-white p-12 text-center shadow-sm">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-sky-500" />
            <p className="text-xl font-black text-slate-900">目前沒有分派給你的委託</p>
            <p className="mt-2 text-slate-600">當客戶建立角色並選擇你後，這裡會自動顯示該筆需求。</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => {
              const statusConfig = getStatusConfig(order.status);

              return (
                <article key={order.id} className="rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3 border-b border-sky-100 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">客戶名稱</p>
                      <p className="mt-2 text-lg font-black text-slate-900">{order.clientName}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">角色名稱</p>
                      <p className="mt-1 text-base font-semibold text-slate-800">{order.name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">下單時間</p>
                      <p className="mt-1 font-medium text-slate-700">{formatDateTime(order.created_at)}</p>
                    </div>
                  </div>

                  <Link
                    href={`/artist/orders/${order.id}`}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    檢視訂單
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
