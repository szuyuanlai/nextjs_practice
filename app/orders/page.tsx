"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

type OrderStatus = "pending" | "approved" | "rejected" | "completed";

type OrderRow = {
  id: string;
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

const statusMap: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "待處理", color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "已批准", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "已拒絕", color: "bg-rose-100 text-rose-700 border-rose-200" },
  completed: { label: "已完成", color: "bg-sky-100 text-sky-700 border-sky-200" },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);

      if (!supabase) {
        setError("Supabase 尚未設定，請先加入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
        setIsLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.replace("/login?redirectTo=%2Forders");
        return;
      }

      const { data, error: queryError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setIsLoading(false);
        return;
      }

      setOrders((data as OrderRow[]) ?? []);
      setIsLoading(false);
    };

    void fetchOrders();
  }, [router]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
              <ArrowLeft className="h-4 w-4" />
              返回首頁
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">訂單中心</h1>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">總訂單</p>
            <p className="text-2xl font-black text-slate-900">{orders.length}</p>
          </div>
        </div>

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <ShieldAlert className="mt-0.5 h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-[30px] border border-sky-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              載入訂單中...
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-sky-200 bg-white p-12 text-center shadow-sm">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-sky-500" />
            <p className="text-xl font-black text-slate-900">目前沒有訂單紀錄</p>
            <p className="mt-2 text-slate-600">提交新的角色需求後，這裡會立即顯示進度。</p>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <article key={order.id} className="rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-sky-100 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">訂單編號</p>
                    <h2 className="mt-2 text-xl font-black text-slate-900">{order.character_name}</h2>
                  </div>

                  <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${statusMap[order.status].color}`}>
                    {statusMap[order.status].label}
                  </span>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">個性</p>
                      <p className="mt-2 text-slate-700">{order.personality}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">外觀描述</p>
                      <p className="mt-2 leading-7 text-slate-700">{order.appearance_description}</p>
                    </div>
                    {order.notes ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">備註</p>
                        <p className="mt-2 leading-7 text-slate-700">{order.notes}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">體型</p>
                      <p className="mt-2 font-semibold text-slate-800">{order.body_size}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">建立時間</p>
                      <p className="mt-2 font-semibold text-slate-800">{new Date(order.created_at).toLocaleString("zh-TW")}</p>
                    </div>
                    {order.attachment_url ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">參考圖片</p>
                        <a
                          href={order.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex rounded-full border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-700"
                        >
                          {order.attachment_name ?? "查看附件"}
                        </a>
                      </div>
                    ) : null}
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
