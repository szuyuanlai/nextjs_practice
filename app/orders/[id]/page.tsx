"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

type OrderStatus = "pending" | "approved" | "rejected" | "completed";

type OrderRow = {
  id: string;
  user_id: string;
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

type Props = {
  params: Promise<{ id: string }>;
};

const statusMap: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "待處理", color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "已批准", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "已拒絕", color: "bg-rose-100 text-rose-700 border-rose-200" },
  completed: { label: "已完成", color: "bg-sky-100 text-sky-700 border-sky-200" },
};

export default function OrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!supabase) {
        setError("Supabase 尚未設定，請先加入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
        setIsLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.replace(`/login?redirectTo=${encodeURIComponent(`/orders/${id}`)}`);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (queryError) {
        setError(queryError.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError("找不到這筆訂單，或你沒有查看權限。");
        setIsLoading(false);
        return;
      }

      setOrder(data as OrderRow);
      setIsLoading(false);
    };

    void fetchOrder();
  }, [id, router]);

  const statusConfig = useMemo(() => {
    if (!order) {
      return null;
    }
    return statusMap[order.status] ?? statusMap.pending;
  }, [order]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/orders" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回訂單中心
        </Link>

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-[30px] border border-sky-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              載入訂單詳情中...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[30px] border border-red-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3 text-red-700">
              <ShieldAlert className="mt-0.5 h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        ) : order ? (
          <section className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-sky-100 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">訂單詳情</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{order.character_name}</h1>
                <p className="mt-2 text-sm text-slate-500">建立時間：{new Date(order.created_at).toLocaleString("zh-TW")}</p>
              </div>
              {statusConfig ? (
                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              ) : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <article className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                <h2 className="text-sm font-black text-slate-900">角色需求</h2>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">個性</p>
                <p className="mt-1 text-slate-700">{order.personality}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">外觀描述</p>
                <p className="mt-1 whitespace-pre-wrap leading-7 text-slate-700">{order.appearance_description}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">備註</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{order.notes || "無"}</p>
              </article>

              <article className="rounded-2xl border border-sky-100 bg-white p-4">
                <h2 className="text-sm font-black text-slate-900">外觀參數</h2>
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                    <span>體型</span>
                    <span className="font-semibold text-slate-900">{order.body_size}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                    <span>髮色</span>
                    <span className="font-mono text-slate-900">{order.hair_color}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                    <span>眼色</span>
                    <span className="font-mono text-slate-900">{order.eye_color}</span>
                  </div>
                </div>

                {order.attachment_url ? (
                  <a
                    href={order.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                  >
                    <FileText className="h-4 w-4" />
                    {order.attachment_name ?? "查看附件"}
                  </a>
                ) : null}
              </article>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
