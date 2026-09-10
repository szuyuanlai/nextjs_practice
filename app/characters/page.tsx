"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FolderKanban, Loader2, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

const sampleCharacters = [
  { name: "夜色織夢", status: "已完成", tone: "暗藍 / 紫色系", updatedAt: "2026-09-10" },
  { name: "晨光巡遊者", status: "草稿中", tone: "淡金 / 天藍系", updatedAt: "2026-09-08" },
  { name: "霧海旅人", status: "待確認", tone: "灰藍 / 白銀系", updatedAt: "2026-09-05" },
];

export default function CharactersPage() {
  const [statusMessage, setStatusMessage] = useState("載入中...");

  useEffect(() => {
    let isCancelled = false;

    const loadCharacters = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) {
        if (!isCancelled) {
          setStatusMessage("Supabase 尚未設定，顯示預設展示內容。");
        }
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isCancelled) {
        return;
      }

      if (!user) {
        setStatusMessage("目前尚未登入，以下為公開預覽內容。");
        return;
      }

      const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });

      if (isCancelled) {
        return;
      }

      if (error) {
        setStatusMessage(`已登入，但資料讀取失敗：${error.message}`);
        return;
      }

      setStatusMessage(`已登入：${user.email ?? user.id}。目前可讀取的 profile 數量：約 ${count ?? 0} 筆。`);
    };

    void loadCharacters();

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
            <FolderKanban className="h-3.5 w-3.5" />
            我的角色
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">我的角色資產庫</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            集中管理你已建立、審核中與已完成的角色專案，方便後續再製與延伸。
          </p>
        </section>

        <section className="mb-6 flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          <p className="text-sm text-slate-600">{statusMessage}</p>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sampleCharacters.map((character) => (
            <article key={character.name} className="rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{character.status}</span>
                <Sparkles className="h-5 w-5 text-sky-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">{character.name}</h2>
              <p className="mt-2 text-sm text-slate-600">風格：{character.tone}</p>
              <p className="mt-1 text-xs text-slate-500">最後更新：{character.updatedAt}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
