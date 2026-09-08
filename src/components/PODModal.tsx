"use client";

import React, { useState } from "react";
import { supabase } from "@/src/lib/supabase/client";

const PRODUCTS = [
  { id: "acrylic", name: "壓克力立牌", price: 250 },
  { id: "ema", name: "繪馬", price: 180 },
  { id: "card", name: "透卡", price: 80 },
  { id: "tapestry", name: "大掛軸", price: 1200 },
];

export default function PODModal({ orderId, onClose }: { orderId?: string; onClose: () => void }) {
  const [product, setProduct] = useState(PRODUCTS[0].id);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        order_id: orderId ?? null,
        client_id: user?.id ?? null,
        product_type: product,
        quantity,
        specs: { preview: true },
      };

      const { error } = await supabase.from("pod_requests").insert(payload);
      if (error) {
        alert("送出失敗：" + error.message);
      } else {
        alert("已送出印製需求，廠商將與你聯絡。");
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded p-6 w-[480px]">
        <h3 className="text-lg font-semibold mb-4">印製周邊</h3>

        <label className="block text-sm mb-1">商品</label>
        <select value={product} onChange={(e) => setProduct(e.target.value)} className="w-full mb-3 p-2 border rounded">
          {PRODUCTS.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — NT${p.price}</option>
          ))}
        </select>

        <label className="block text-sm mb-1">數量</label>
        <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full mb-4 p-2 border rounded" />

        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={onClose}>取消</button>
          <button className="px-3 py-2 rounded bg-sky-600 text-white" onClick={submit} disabled={submitting}>{submitting ? "送出中…" : "送出需求"}</button>
        </div>
      </div>
    </div>
  );
}
