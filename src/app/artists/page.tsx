import Link from "next/link";
import { ArrowLeft, Palette, Sparkles } from "lucide-react";
import { ArtistMarquee } from "@/src/components/ArtistMarquee";

export default function ArtistsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <section className="mb-8 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            <Palette className="h-3.5 w-3.5" />
            合作繪師
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">合作繪師展示牆</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            瀏覽可合作的畫師，查看風格、作品與公開資料，快速找到適合的創作者。
          </p>
        </section>

        <section className="rounded-[30px] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <ArtistMarquee />
        </section>
      </div>
    </main>
  );
}
