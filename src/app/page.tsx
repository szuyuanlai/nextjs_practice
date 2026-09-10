import { Navbar } from "@/src/components/Navbar";
import { ArtistMarquee } from "@/src/components/ArtistMarquee";
import { Palette, Wand2 } from "lucide-react";

const processSteps = [
  { title: "1. 需求確認", text: "填寫角色風格、配色與參考方向，快速對齊你想要的世界觀。" },
  { title: "2. 方案執行", text: "由團隊整理重點並進入製作，分階段回報讓進度透明可追蹤。" },
  { title: "3. 完稿交付", text: "完成定稿與素材整理，交付可直接應用的角色資產。" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.2),_transparent_22%),linear-gradient(180deg,#070b16_0%,#0f172a_100%)] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="mb-10 rounded-[32px] border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-violet-500/10 sm:p-8 lg:p-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-400/30 bg-pink-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-pink-200">
              <span className="h-2 w-2 rounded-full bg-pink-400" />
              二次元老婆客製化服務
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                讓你的 <span className="bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">理想角色</span>
                <br />
                變成真實可愛的存在
              </h1>

              <p className="max-w-xl text-lg leading-8 text-slate-300">
                從外觀、個性、髮色到配件風格，我們為你打造專屬角色設計，提供精緻且具故事感的二次元老婆定制方案。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/characters/create"
                className="rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-400 px-5 py-3 font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:brightness-110"
              >
                立即預約
              </a>
              <a
                href="/artists"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:border-pink-400/40 hover:bg-white/10"
              >
                查看合作繪師
              </a>
              <a
                href="/orders"
                className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 font-semibold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/15"
              >
                訂單查詢
              </a>
            </div>
          </div>
        </section>

        <section id="process" className="mb-10 rounded-[32px] border border-white/10 bg-slate-900/60 p-6 sm:p-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
            <Wand2 className="h-3.5 w-3.5" />
            訂製流程
          </p>
          <h2 className="mb-6 text-2xl font-black tracking-tight text-white sm:text-3xl">三步驟完成你的角色委託</h2>

          <div className="grid gap-4 md:grid-cols-3">
            {processSteps.map((step) => (
              <article key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-black text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="artists" className="mb-4">
          <div className="mb-4">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              <Palette className="h-3.5 w-3.5" />
              合作繪師
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">選擇喜歡的風格，直接前往委託</h2>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/60 p-4 shadow-2xl shadow-violet-500/10 sm:p-5">
            <ArtistMarquee />
          </div>
        </section>

      </div>
    </main>
  );
}
