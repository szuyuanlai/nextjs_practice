"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Palette, Sparkles } from "lucide-react";
import { ArtistMarquee } from "@/src/components/ArtistMarquee";
import { getSupabaseClient } from "@/src/lib/supabase/client";

export default function ArtistsPage() {
  const [statusMessage, setStatusMessage] = useState("載入中...");

  useEffect(() => {
    let isCancelled = false;

    const loadArtists = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) {
        if (!isCancelled) {
          setStatusMessage("Supabase 尚未設定，顯示預設展示內容。");
        }
        return;
      }

      const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });

      if (isCancelled) {
        return;
      }

      if (error) {
        setStatusMessage(`繪師資料讀取失敗：${error.message}`);
        return;
      }

      setStatusMessage(`目前可讀取的 profile 數量：約 ${count ?? 0} 筆，可用來呈現合作繪師名單。`);
    };

    void loadArtists();

    return () => {
      isCancelled = true;
    };
  }, []);

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

        <section className="mb-6 flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          <p className="text-sm text-slate-600">{statusMessage}</p>
        </section>

        <section className="rounded-[30px] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <ArtistMarquee />
        </section>

        <section className="mt-6 rounded-[30px] border border-dashed border-sky-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <div className="inline-flex items-center gap-2 text-sky-700">
            <Sparkles className="h-4 w-4" />
            頁面已建立
          </div>
          <p className="mt-2">如果你在 Vercel 看到 404，請確認這些路由所在分支已經 git commit 並 push 到遠端。</p>
        </section>
      </div>
    </main>
  );
}
