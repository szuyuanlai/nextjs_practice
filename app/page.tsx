import { Navbar } from "@/src/components/Navbar";
import { OrderForm } from "@/src/components/OrderForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.2),_transparent_22%),linear-gradient(180deg,#070b16_0%,#0f172a_100%)] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="mb-10 grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
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
                href="#plans"
                className="rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-400 px-5 py-3 font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:brightness-110"
              >
                立即預約
              </a>
              <a
                href="#gallery"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:border-pink-400/40 hover:bg-white/10"
              >
                查看角色藝廊
              </a>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-violet-500/10">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-pink-400/20 bg-pink-500/10 p-4">
                <p className="text-sm text-pink-200">客製化角色</p>
                <p className="mt-3 text-3xl font-black text-white">120+</p>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-sm text-cyan-200">平均交付</p>
                <p className="mt-3 text-3xl font-black text-white">7 天</p>
              </div>
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 sm:col-span-2">
                <p className="text-sm text-violet-200">設計風格</p>
                <p className="mt-3 text-xl font-semibold text-white">
                  可愛、成熟、御姐、校園、黑暗蘿莉、日系潮流
                </p>
              </div>
            </div>
          </div>
        </section>

        <OrderForm />
      </div>
    </main>
  );
}
