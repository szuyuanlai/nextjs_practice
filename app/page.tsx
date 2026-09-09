"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardList, Palette, Sparkles, Wand2 } from "lucide-react";
import { Navbar } from "@/src/components/Navbar";
import { ArtistMarquee } from "@/src/components/ArtistMarquee";
import { OrderForm } from "@/src/components/OrderForm";
import { OrderHistoryModal } from "@/src/components/OrderHistoryModal";

const plans = [
  {
    title: "輕度客製",
    price: "NT$ 2,800",
    description: "適合想先試水溫、建立角色雛形的創作者與品牌主。",
    features: ["角色概念整理", "2 次全版修正", "高保真設定檔"],
  },
  {
    title: "標準定制",
    price: "NT$ 6,800",
    description: "最熱門的專業方案，適合個人 IP、社群品牌與新作角色開發。",
    features: ["完整角色設計", "服裝與表情導向", "交付稿件與提案風格板"],
    highlight: true,
  },
  {
    title: "聯名創作",
    price: "NT$ 12,800",
    description: "提供品牌聯名、畫師合作、作品系列連線與視覺策略輸出。",
    features: ["聯名品牌提案", "跨畫師分工協作", "系列宣傳素材"],
  },
];

const processSteps = [
  { title: "1. 需求確認", text: "填寫角色風格、喜好、配色與參考圖，讓我們快速理解你的方向。" },
  { title: "2. 方案選擇", text: "依照需求和預算選擇服務層級，並確認交付範圍與時程。" },
  { title: "3. 設計與修正", text: "由專案團隊產出草圖與完善稿，至少提供兩輪細節調整。" },
  { title: "4. 交付與追蹤", text: "製成最終成果檔案，並提供後續發展與品牌延伸建議。" },
];

export default function HomePage() {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  return (
    <>
      <OrderHistoryModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} />

      <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] text-slate-800">
        <Navbar />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <section className="mb-12 grid items-center gap-8 rounded-[32px] border border-sky-100 bg-white/80 p-6 shadow-[0_20px_60px_rgba(59,130,246,0.08)] backdrop-blur-sm sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                角色設計與品牌聯名工作室
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  讓你的 <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent">品牌與角色</span>
                  <br />
                  變得更有辨識度
                </h1>

                <p className="max-w-xl text-lg leading-8 text-slate-600">
                  我們提供服務方案、訂製流程、聯名畫師協作與訂單查詢系統，讓每個角色設定、作品創作與品牌延伸都能順暢落地。
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#plans"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:translate-y-[-1px]"
                >
                  立即預約
                  <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-5 py-3 font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                >
                  訂單查詢
                </button>
              </div>
            </div>

            <div className="grid gap-4 rounded-[28px] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 shadow-[0_25px_60px_rgba(14,116,144,0.08)]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-sky-700">客製專案</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">120+</p>
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
                  <p className="text-sm text-cyan-700">平均交付</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">7天</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:col-span-2">
                  <p className="text-sm text-blue-700">專案方向</p>
                  <p className="mt-3 text-lg font-semibold text-slate-800">
                    角色設計、人物設定、品牌聯名、作品延伸設計
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-white p-3 text-sm text-slate-600">
                <BadgeCheck className="h-5 w-5 text-emerald-500" />
                視覺稿件與需求流程皆可追蹤，會員登入後可直接查看訂單進度。
              </div>
            </div>
          </section>

          <section id="plans" className="mb-12 scroll-mt-28">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  服務方案
                </p>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">依需求選擇合適的合作模式</h2>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.title}
                  className={[
                    "rounded-[28px] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg",
                    plan.highlight
                      ? "border-sky-300 bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-sky-200"
                      : "border-sky-100 bg-white text-slate-700",
                  ].join(" ")}
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-black">{plan.title}</h3>
                    {plan.highlight ? <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">熱門</span> : null}
                  </div>

                  <div className="mb-5 text-3xl font-black">{plan.price}</div>
                  <p className={plan.highlight ? "text-sky-50" : "text-slate-600"}>{plan.description}</p>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <span
                          className={[
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                            plan.highlight ? "bg-white/15 text-white" : "bg-sky-100 text-sky-700",
                          ].join(" ")}
                        >
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="#order-form"
                    className={[
                      "mt-7 inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold",
                      plan.highlight
                        ? "bg-white text-sky-700 hover:bg-sky-50"
                        : "bg-sky-50 text-sky-700 hover:bg-sky-100",
                    ].join(" ")}
                  >
                    選擇方案 <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section id="process" className="mb-12 scroll-mt-28 rounded-[32px] border border-sky-100 bg-white p-6 shadow-[0_20px_60px_rgba(59,130,246,0.05)] sm:p-8 lg:p-10">
            <div className="mb-7">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                <Wand2 className="h-3.5 w-3.5" />
                訂製流程
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">從構思到成品，流程清楚不迷路</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {processSteps.map((step) => (
                <div key={step.title} className="rounded-[24px] border border-sky-100 bg-sky-50/60 p-5">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-sm font-black text-white">
                    {step.title.split(".")[0]}
                  </div>
                  <h3 className="mb-3 text-lg font-black text-slate-900">{step.title}</h3>
                  <p className="leading-7 text-slate-600">{step.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="artists" className="mb-12 scroll-mt-28">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                  <Palette className="h-3.5 w-3.5" />
                  聯名畫師
                </p>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">和畫師一起把角色故事做得更完整</h2>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
              <ArtistMarquee />
            </div>
          </section>

          <section id="orders" className="mb-12 scroll-mt-28 rounded-[32px] border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-6 shadow-[0_20px_60px_rgba(14,116,144,0.06)] sm:p-8 lg:p-10">
            <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                  <ClipboardList className="h-3.5 w-3.5" />
                  訂單查詢
                </p>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">登入後即可即時查看訂單狀態</h2>
                <p className="mt-3 max-w-xl text-slate-600">
                  從需求提交、審核進度到成品交付，我們都會保留記錄，讓每個合作節奏更清楚。
                </p>
              </div>

              <div className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <BadgeCheck className="h-5 w-5" />
                    進度透明化
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <BadgeCheck className="h-5 w-5" />
                    原始檔與提案檔保留
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOrderModalOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700"
                  >
                    進入訂單中心 <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div id="order-form" className="scroll-mt-28">
            <OrderForm />
          </div>
        </div>
      </main>
    </>
  );
}
