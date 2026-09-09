"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import OrderStepper from "@/src/components/OrderStepper";
import { supabase } from "@/src/lib/supabase/client";
import type { Order } from "@/src/types/order";

const PhotoStudioWrapper = dynamic(() => import("@/src/components/PhotoStudioWrapper"), { ssr: false });
const PODWrapper = dynamic(() => import("@/src/components/PODWrapper"), { ssr: false });

export default function MyAssetsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setIsAuthenticated(false);
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      const orderRows = (data as Order[] | null) ?? [];

      if (fetchError) {
        console.warn("Failed to load my assets:", fetchError.message);
        setOrders([]);
      } else {
        setOrders(orderRows);
      }

      setIsLoading(false);
    };

    void loadOrders();
  }, []);

  const completed = orders.filter((o) => o.status === "completed" || o.status === "delivered");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">載入資產中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">請先登入以查看專屬資產。</div>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">我的老婆藝廊</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">已完稿作品</h2>
        {completed.length === 0 ? (
          <div className="text-slate-500">目前沒有可下載的成品。</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {completed.map((o) => (
              <div key={o.id} className="border rounded overflow-hidden">
                <div className="p-3">
                  <div className="text-sm font-medium mb-2">訂單 {o.id}</div>
                  <div className="text-sm text-slate-600 mb-2">方案：{o.tier}</div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(o.assets ?? []).map((a, i) => (
                      <a key={i} href={a.image_url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.image_url} alt={`asset-${i}`} className="h-40 w-full object-cover" />
                      </a>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <OrderStepper status={o.status ?? "draft"} />
                    <div className="flex items-center gap-2">
                      <PhotoStudioWrapper initialOverlay={(o.assets ?? [])[0]?.image_url ?? null} />
                      <PODWrapper orderId={o.id} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">近期訂單</h2>
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="p-4 border rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">訂單 {o.id}</div>
                  <div className="text-sm text-slate-600">方案：{o.tier} • 建立於 {new Date(o.created_at ?? "").toLocaleString()}</div>
                </div>
                <OrderStepper status={o.status ?? "draft"} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
