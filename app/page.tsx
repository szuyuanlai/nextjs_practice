import { Navbar } from "@/src/components/Navbar";
import { ArtistMarquee } from "@/src/components/ArtistMarquee";
import { ArrowRight, Palette, Wand2 } from "lucide-react";
import Image from "next/image";
import { existsSync } from "node:fs";
import { join } from "node:path";

const processSteps = [
  { title: "1. 需求確認", text: "填寫角色風格、配色與參考方向，快速對齊你想要的世界觀。" },
  { title: "2. 方案執行", text: "由團隊整理重點並進入製作，分階段回報讓進度透明可追蹤。" },
  { title: "3. 完稿交付", text: "完成定稿與素材整理，交付可直接應用的角色資產。" },
];

const heroImageSrc = existsSync(join(process.cwd(), "public", "hero-character-banner.jpg"))
  ? "/hero-character-banner.jpg"
  : null;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] text-slate-800">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="mb-10 rounded-[32px] border border-sky-100 bg-white/80 p-6 shadow-[0_20px_60px_rgba(59,130,246,0.08)] backdrop-blur-sm sm:p-8 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                角色設計工作室
              </div>

              <div className="space-y-5">
                <h1 className="text-5xl font-black tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                  設計出專屬於你的 <br />
                  <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent">二次元角色</span>
                </h1>
                <p className="max-w-xl text-lg leading-8 text-slate-600">
                  從外觀設定、個性塑造到配色細節，將你的創作想像轉化成高質感立繪，建立獨一無二的角色形象。
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="/characters/create" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:translate-y-[-1px]"
                >
                  創建角色
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="/artists"
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-5 py-3 font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                >
                  合作繪師
                </a>
                <a
                  href="/orders"
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  訂單查詢
                </a>
              </div>
            </div>

            <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
              <article className="flex h-[320px] max-h-[320px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:h-[480px] lg:max-h-[480px]">
                {heroImageSrc ? (
                  <div className="relative flex-1 min-h-0 w-full bg-slate-50">
                    <Image
                      src={heroImageSrc}
                      alt="角色立繪展示"
                      fill
                      sizes="(min-width: 1024px) 28rem, (min-width: 640px) 24rem, 92vw"
                      className="object-contain object-center p-2"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex flex-1 min-h-0 w-full items-center justify-center bg-slate-100">
                    <svg
                      width="220"
                      height="220"
                      viewBox="0 0 220 220"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-label="角色圖佔位"
                      role="img"
                    >
                      <circle cx="110" cy="110" r="106" fill="#E2E8F0" />
                      <circle cx="110" cy="90" r="42" fill="#94A3B8" />
                      <path d="M38 188C49 152 77 134 110 134C143 134 171 152 182 188" fill="#94A3B8" />
                    </svg>
                  </div>
                )}
                <div className="shrink-0 px-4 py-3 text-sm font-medium text-gray-700">角色範例</div>
              </article>
            </div>
          </div>
        </section>

        <section id="process" className="mb-10 rounded-[32px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            <Wand2 className="h-3.5 w-3.5" />
            訂製流程
          </p>
          <h2 className="mb-6 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">三步驟完成你的角色委託</h2>

          <div className="grid gap-4 md:grid-cols-3">
            {processSteps.map((step) => (
              <article key={step.title} className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                <h3 className="text-lg font-black text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="artists" className="mb-4">
          <div className="mb-4">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              <Palette className="h-3.5 w-3.5" />
              合作繪師
            </p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">選擇喜歡的風格，直接前往委託</h2>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
            <ArtistMarquee />
          </div>
        </section>
      </div>
    </main>
  );
}
