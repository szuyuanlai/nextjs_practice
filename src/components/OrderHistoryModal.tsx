"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

type OrderStatus = "pending" | "approved" | "rejected" | "completed" | "processing" | "done" | string | null;

type OrderRow = {
  id: string;
  character_name: string;
  body_size: string;
  personality: string;
  created_at: string;
  status?: OrderStatus;
};

const getStatusLabel = (status?: OrderStatus) => {
  const normalized = (status ?? "processing").toLowerCase();

  switch (normalized) {
    case "approved":
      return "已確認";
    case "rejected":
      return "已拒絕";
    case "completed":
    case "done":
      return "已完成";
    case "pending":
    case "processing":
    default:
      return "處理中";
  }
};

export function OrderHistoryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);

      if (!supabase) {
        setError("Supabase 尚未設定，請先填入環境變數。");
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("請先登入後再查詢歷史訂單。");
        setIsLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("orders")
        .select("id, character_name, body_size, personality, created_at, status")
        .eq("user_id", user.id)
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
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-sky-100 bg-white p-5 shadow-2xl shadow-sky-200/50 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
              <ClipboardList className="h-3.5 w-3.5" />
              訂單查詢
            </p>
            <h3 className="text-2xl font-black text-slate-900">歷史訂單</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="關閉訂單查詢"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[180px] items-center justify-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            正在載入訂單資料...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-sky-500" />
            <p className="text-lg font-black text-slate-900">目前尚無歷史訂單</p>
            <p className="mt-2 text-sm text-slate-600">您提交的客製化需求會顯示在這裡。</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-sky-100">
            <div className="grid grid-cols-[1.4fr_0.9fr_1.1fr_1.1fr] gap-3 bg-sky-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              <span>角色名稱</span>
              <span>身材設定</span>
              <span>性格設定</span>
              <span>狀態</span>
            </div>

            <div className="divide-y divide-sky-100 bg-white">
              {orders.map((order) => (
                <div key={order.id} className="grid grid-cols-[1.4fr_0.9fr_1.1fr_1.1fr] gap-3 px-4 py-4 text-sm text-slate-700">
                  <div>
                    <p className="font-bold text-slate-900">{order.character_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleString("zh-TW")}
                    </p>
                  </div>
                  <div>{order.body_size}</div>
                  <div>{order.personality}</div>
                  <div>
                    <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
