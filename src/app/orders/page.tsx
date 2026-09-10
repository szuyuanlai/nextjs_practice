"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

const sampleOrders = [
  { id: "ORD-20260910-001", status: "處理中", item: "角色三視圖", updatedAt: "2026-09-10" },
  { id: "ORD-20260908-014", status: "待確認", item: "人設草圖", updatedAt: "2026-09-08" },
  { id: "ORD-20260903-007", status: "已完成", item: "角色延伸設計", updatedAt: "2026-09-03" },
];

export default function OrdersPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const guardPage = async () => {
      const client = getSupabaseClient();

      if (!client) {
        if (!isCancelled) {
          setAuthLoading(false);
        }
        return;
      }

      const {
        data: { user },
      } = await client.auth.getUser();

      if (isCancelled) {
        return;
      }

      if (!user) {
        router.replace("/login?redirectTo=%2Forders");
        return;
      }

      setAuthLoading(false);
    };

    void guardPage();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4">
        <div className="rounded-2xl border border-sky-100 bg-white px-5 py-4 text-slate-600 shadow-sm">載入中...</div>
      </main>
    );
  }

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
            訂單查詢
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">客戶訂單查詢與狀態追蹤</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            查看需求提交、處理進度與完成狀態，讓你的委託流程更透明。
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sampleOrders.map((order) => (
            <article key={order.id} className="rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{order.status}</span>
                <Sparkles className="h-5 w-5 text-sky-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">{order.id}</h2>
              <p className="mt-2 text-sm text-slate-600">項目：{order.item}</p>
              <p className="mt-1 text-xs text-slate-500">更新時間：{order.updatedAt}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
