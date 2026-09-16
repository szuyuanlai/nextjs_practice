"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type CharacterRecord = {
  id: string;
  user_id: string;
  name: string;
  gender: string | null;
  personality_tags: string[] | null;
  bio: string | null;
  appearance_details: Record<string, unknown> | null;
  image_urls: string[] | null;
  created_at: string;
};

type Props = {
  characterId: string;
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readAppearanceText(
  appearance: Record<string, unknown> | null,
  key: string,
  fallback = "未設定",
) {
  const value = appearance?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
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

export default function CharacterDetailView({ characterId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [character, setCharacter] = useState<CharacterRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCharacter = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) {
        if (!cancelled) {
          setErrorMessage("Supabase 尚未設定，無法讀取角色資料。");
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
        router.replace(`/login?redirectTo=${encodeURIComponent(`/characters/${characterId}`)}`);
        return;
      }

      const { data, error } = await supabase
        .from("characters")
        .select("id,user_id,name,gender,personality_tags,bio,appearance_details,image_urls,created_at")
        .eq("id", characterId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        setErrorMessage(`讀取角色失敗：${error.message}`);
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("查無此角色，或你沒有權限查看這筆資料。");
        setLoading(false);
        return;
      }

      setCharacter(data as CharacterRecord);
      setLoading(false);
    };

    void loadCharacter();

    return () => {
      cancelled = true;
    };
  }, [characterId, router]);

  const appearance = useMemo(() => character?.appearance_details ?? null, [character]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-5 py-4 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          載入角色資料中...
        </div>
      </main>
    );
  }

  if (errorMessage || !character) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/characters"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800"
          >
            <ArrowLeft className="h-4 w-4" />
            返回角色列表
          </Link>

          <section className="rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              讀取失敗
            </div>
            <h1 className="text-2xl font-black text-slate-900">無法顯示角色詳情</h1>
            <p className="mt-3 text-slate-600">{errorMessage || "發生未知錯誤。"}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/characters"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800"
        >
          <ArrowLeft className="h-4 w-4" />
          返回角色列表
        </Link>

        <section className="mb-6 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            <Sparkles className="h-3.5 w-3.5" />
            Character Profile
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{character.name}</h1>
          <p className="mt-3 text-sm text-slate-600">建立時間：{formatDate(character.created_at)}</p>
          <p className="mt-1 text-sm text-slate-600">
            執筆繪師：{readAppearanceText(appearance, "selected_artist_name")}
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">基本身份與性格</h2>
            <dl className="mt-4 grid gap-4 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">性別 / 性向</dt>
                <dd className="mt-1 text-slate-800">{character.gender || "未設定"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">性格標籤</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {(character.personality_tags ?? []).length > 0 ? (
                    character.personality_tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-800">未設定</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">背景故事 / 簡介</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-800">{character.bio || "未設定"}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">外觀與外貌細節</h2>
            <dl className="mt-4 grid gap-4 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">發型</dt>
                <dd className="mt-1 text-slate-800">{readAppearanceTextFromKeys(appearance, ["hairstyle", "hairstyle_hair_color"])}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">頭髮顏色</dt>
                <dd className="mt-1 flex items-center gap-2 text-slate-800">
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-slate-300"
                    style={{ backgroundColor: readAppearanceTextFromKeys(appearance, ["hair_color", "theme_color"], "#cccccc") }}
                  />
                  {readAppearanceTextFromKeys(appearance, ["hair_color"], "未設定")}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">瞳孔形狀 / 風格</dt>
                <dd className="mt-1 text-slate-800">{readAppearanceTextFromKeys(appearance, ["eye_style", "eye_color_style"])}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">眼睛顏色</dt>
                <dd className="mt-1 flex items-center gap-2 text-slate-800">
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-slate-300"
                    style={{ backgroundColor: readAppearanceTextFromKeys(appearance, ["eye_color"], "#cccccc") }}
                  />
                  {readAppearanceTextFromKeys(appearance, ["eye_color"], "未設定")}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">身高 / 體型</dt>
                <dd className="mt-1 text-slate-800">{readAppearanceText(appearance, "height_body_type")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">代表色 / 主題色</dt>
                <dd className="mt-1 flex items-center gap-2 text-slate-800">
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-slate-300"
                    style={{ backgroundColor: readAppearanceText(appearance, "theme_color", "#cccccc") }}
                  />
                  {readAppearanceText(appearance, "theme_color")}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">服裝風格與配件</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-800">{readAppearanceText(appearance, "outfit_accessories")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">特殊備註</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-800">{readAppearanceText(appearance, "additional_notes")}</dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="mt-6 rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">參考圖片</h2>
          {(character.image_urls ?? []).length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {character.image_urls?.map((url, index) => (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  key={`${url}-${index}`}
                  className="group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                >
                  <img
                    src={url}
                    alt={`參考圖 ${index + 1}`}
                    className="h-32 w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">未上傳參考圖片</p>
          )}
        </section>
      </div>
    </main>
  );
}
