"use client";

import Link from "next/link";
import React from "react";

const tiers = [
  {
    id: "tier1",
    name: "Tier 1",
    title: "三視圖專案",
    price: "NT$3,000",
    features: ["正面/側面/背面 三視圖", "基本上色", "單人物體"],
    eta: "7-10 工作日",
  },
  {
    id: "tier2",
    name: "Tier 2",
    title: "人設卡 + 高階細節",
    price: "NT$6,000",
    features: ["全身人設卡", "高階細節紋理", "含表情/配件"],
    eta: "10-14 工作日",
  },
  {
    id: "tier3",
    name: "Tier 3",
    title: "Live2D 拆項圖層",
    price: "NT$12,000",
    features: ["拆分圖層備 Live2D", "含綁定建議", "多角度支援"],
    eta: "14-21 工作日",
  },
  {
    id: "tier4",
    name: "Tier 4",
    title: "動畫 / 實體公仔全套",
    price: "NT$30,000+",
    features: ["短片動畫製作", "實體公仔設計與監製", "全套交付素材"],
    eta: "依需求估價",
  },
];

export default function PricingTable({ artistId }: { artistId: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {tiers.map((t, idx) => (
        <div
          key={t.id}
          className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transform hover:scale-101 transition-all duration-200 ${
            idx === 0
              ? "bg-gradient-to-br from-pink-400 to-rose-500"
              : idx === 1
              ? "bg-gradient-to-br from-indigo-500 to-violet-600"
              : idx === 2
              ? "bg-gradient-to-br from-cyan-400 to-sky-600"
              : "bg-gradient-to-br from-amber-400 to-orange-500"
          }`}
        >
          <div className="absolute -right-10 -top-10 opacity-20 text-[6rem] select-none">✦</div>

          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold tracking-wider">{t.name}</div>
            <div className="text-xs bg-white/20 px-2 py-1 rounded">{t.eta}</div>
          </div>

          <h3 className="text-xl font-extrabold mb-2 drop-shadow">{t.title}</h3>
          <div className="text-3xl font-extrabold mb-4 drop-shadow-lg">{t.price}</div>

          <ul className="mb-4 text-sm space-y-1 list-inside">
            {t.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="inline-block w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">🎴</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            href={`/orders/new?tier=${encodeURIComponent(t.title)}&artist=${encodeURIComponent(artistId)}`}
            className="inline-block w-full text-center rounded-xl bg-white text-black px-4 py-3 font-semibold shadow-sm"
          >
            立即預約
          </Link>

          <div className="mt-4 text-xs opacity-90">※ 價格僅供參考，實際價格依需求調整。</div>
        </div>
      ))}
    </div>
  );
}
