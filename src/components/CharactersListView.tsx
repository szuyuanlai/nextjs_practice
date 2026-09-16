"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FolderKanban, Loader2, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type CharacterListItem = {
  id: string;
  name: string;
  created_at: string;
  status: string | null;
  gender: string | null;
  personality_tags: string[] | null;
  image_urls: string[] | null;
  appearance_details: Record<string, unknown> | null;
};

type CharacterTab = "completed" | "in_progress";

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function readAppearanceTextFromKeys(
  appearance: Record<string, unknown> | null,
  keys: string[],
  fallback = "未設定",
) {
  for (const key of keys) {
    const value = appearance?.[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return fallback;
}

export default function CharactersListView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CharacterTab>("completed");
  const [statusMessage, setStatusMessage] = useState("讀取角色資料中...");
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadCharacters = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) {
        if (!cancelled) {
          setStatusMessage("Supabase 尚未設定，無法讀取角色資料。");
          setLoading(false);
        }
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (userError || !user) {
        router.replace("/login?redirectTo=%2Fcharacters");
        return;
      }

      const { data, error } = await supabase
        .from("characters")
        .select("id,name,created_at,status,gender,personality_tags,image_urls,appearance_details")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (error) {
        setStatusMessage(`讀取角色失敗：${error.message}`);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as CharacterListItem[];
      setCharacters(list);
      setStatusMessage(`已載入 ${list.length} 筆角色資料`);
      setLoading(false);
    };

    void loadCharacters();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const completedCharacters = useMemo(
    () => characters.filter((item) => (item.status ?? "in_progress") === "completed"),
    [characters],
  );

  const inProgressCharacters = useMemo(
    () => characters.filter((item) => (item.status ?? "in_progress") === "in_progress"),
    [characters],
  );

  const filteredCharacters = activeTab === "completed" ? completedCharacters : inProgressCharacters;
  const hasCharacters = filteredCharacters.length > 0;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-5 py-4 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          載入中...
        </div>
      </main>
    );
  }

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
            集中管理你已建立的角色 DNA 與繪師綁定資料，點擊卡片可查看完整角色詳情。
          </p>
        </section>

        <section className="mb-6 flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm">
          <Loader2 className="h-4 w-4 text-sky-600" />
          <p className="text-sm text-slate-600">{statusMessage}</p>
        </section>

        <section className="mb-6 rounded-2xl border border-sky-100 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={[
                "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                activeTab === "completed"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              我的角色 (已完成)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("in_progress")}
              className={[
                "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                activeTab === "in_progress"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              進行中訂單 / 未完成角色
            </button>
          </div>
        </section>

        {hasCharacters ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCharacters.map((character) => {
              const appearance = character.appearance_details;
              const themeColor = readAppearanceTextFromKeys(appearance, ["theme_color"], "#7dd3fc");
              const artistName = readAppearanceTextFromKeys(appearance, ["selected_artist_name"], "尚未指派");
              const thumbnailUrl = character.image_urls?.[0] ?? "";
              const isCompleted = (character.status ?? "in_progress") === "completed";

              return (
                <article
                  key={character.id}
                  className="group overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-44 overflow-hidden border-b border-sky-100 bg-[linear-gradient(120deg,#e0f2fe_0%,#f0f9ff_45%,#ecfeff_100%)]">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={`${character.name} 參考圖`}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm backdrop-blur">
                          尚無參考圖
                        </div>
                      </div>
                    )}

                    <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: themeColor }} />
                      {themeColor}
                    </div>

                    <div className="absolute right-3 top-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                      {character.gender || "未設定性別"}
                    </div>

                    <div
                      className={[
                        "absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs font-semibold",
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700",
                      ].join(" ")}
                    >
                      {isCompleted ? "已完成" : "繪製中"}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h2 className="line-clamp-1 text-2xl font-black text-slate-900">{character.name}</h2>
                      <Sparkles className="mt-1 h-5 w-5 shrink-0 text-sky-500 transition group-hover:rotate-12" />
                    </div>

                    <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
                      <p className="font-semibold text-slate-800">執筆繪師</p>
                      <p className="mt-0.5 line-clamp-1">{artistName}</p>
                    </div>

                    <p className="line-clamp-2 text-sm text-slate-600">
                      性格：{character.personality_tags?.length ? character.personality_tags.join("、") : "未設定"}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">建立日期：{formatDate(character.created_at)}</p>
                      {isCompleted ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          已可製作周邊
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          製作進行中
                        </span>
                      )}
                    </div>

                    {isCompleted ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link
                          href="/shop"
                          className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          製作周邊
                        </Link>
                        <Link
                          href={`/characters/${character.id}`}
                          className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700"
                        >
                          查看完整資產
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-1 gap-2">
                        <Link
                          href="/orders"
                          className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                        >
                          查看訂單進度
                        </Link>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="rounded-[28px] border border-sky-100 bg-white p-8 text-center shadow-sm">
            {activeTab === "completed" ? (
              <>
                <h2 className="text-xl font-black text-slate-900">目前沒有已完成角色</h2>
                <p className="mt-2 text-slate-600">完成後的角色會出現在這裡，並可直接製作周邊。</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-black text-slate-900">目前沒有進行中角色</h2>
                <p className="mt-2 text-slate-600">建立新角色後，會先出現在進行中分頁。</p>
              </>
            )}

            <Link
              href="/characters/create"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              前往建立角色
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
