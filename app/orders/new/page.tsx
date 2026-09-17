"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";
import type { Character } from "@/src/types/order";

type Step = 1 | 2;
type StatusMessage = { type: "success" | "error"; message: string };

type CharacterForm = {
  character_name: string;
  character_gender: string;
  hair_color: string;
  eye_color: string;
  personality_tags: string;
  bio: string;
  hairstyle: string;
  eyestyle: string;
  height_body_type: string;
  theme_color: string;
  outfit_accessories: string;
  additional_notes: string;
  selected_artist_name: string;
  reference_image_urls: string;
  bust_size: string;
  is_anonymous: boolean;
};

const EMPTY_CHARACTER_FORM: CharacterForm = {
  character_name: "",
  character_gender: "女性",
  hair_color: "#8b5cf6",
  eye_color: "#1d4ed8",
  personality_tags: "可愛、活潑",
  bio: "",
  hairstyle: "",
  eyestyle: "",
  height_body_type: "",
  theme_color: "#f9a8d4",
  outfit_accessories: "",
  additional_notes: "",
  selected_artist_name: "",
  reference_image_urls: "",
  bust_size: "",
  is_anonymous: false,
};

function normalizeNullableId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseTags(value: string) {
  return value
    .split(/[，,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseReferenceUrls(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function NewOrderPageContent() {
  const search = useSearchParams();
  const router = useRouter();
  const selectedArtistFromQuery = search.get("artist") ?? "";

  const [step, setStep] = useState<Step>(1);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [existingCharacters, setExistingCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [characterForm, setCharacterForm] = useState<CharacterForm>(EMPTY_CHARACTER_FORM);
  const [merchType, setMerchType] = useState("壓克力立牌");
  const [requirements, setRequirements] = useState("需要明亮、親和的角色感，盡量維持可愛感");
  const [shippingAddress, setShippingAddress] = useState("台北市中山區南京東路三段 123 號 5 樓");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCharacters = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (!cancelled) {
          setStatus({ type: "error", message: "Supabase 尚未設定，請先設定 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY。" });
        }
        setIsLoadingCharacters(false);
        return;
      }

      const { data, error } = await supabase
        .from("characters")
        .select("id,user_id,character_name,character_gender,personality_tags,bio,hairstyle,hair_color,eye_style,eye_color,height_body_type,bust_size,theme_color,outfit_accessories,additional_notes,selected_artist_name,reference_image_urls,is_anonymous,status,created_at")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setStatus({ type: "error", message: `載入角色失敗：${error.message}` });
        setExistingCharacters([]);
      } else {
        setExistingCharacters((data ?? []) as Character[]);
        if (!selectedCharacterId && (data?.length ?? 0) > 0) {
          setSelectedCharacterId((data?.[0] as Character).id);
        }
      }

      setIsLoadingCharacters(false);
    };

    void loadCharacters();
    return () => {
      cancelled = true;
    };
  }, [selectedCharacterId]);

  const selectedCharacter = useMemo(
    () => existingCharacters.find((item) => item.id === selectedCharacterId) ?? null,
    [existingCharacters, selectedCharacterId],
  );

  useEffect(() => {
    if (!selectedCharacter) return;

    setCharacterForm({
      character_name: selectedCharacter.character_name ?? "",
      character_gender: selectedCharacter.character_gender ?? "女性",
      hair_color: selectedCharacter.hair_color ?? "#8b5cf6",
      eye_color: selectedCharacter.eye_color ?? "#1d4ed8",
      personality_tags: (selectedCharacter.personality_tags ?? []).join("、"),
      bio: selectedCharacter.bio ?? "",
      hairstyle: selectedCharacter.hairstyle ?? "",
      eyestyle: selectedCharacter.eye_style ?? "",
      height_body_type: selectedCharacter.height_body_type ?? "",
      theme_color: selectedCharacter.theme_color ?? "#f9a8d4",
      outfit_accessories: selectedCharacter.outfit_accessories ?? "",
      additional_notes: selectedCharacter.additional_notes ?? "",
      selected_artist_name: selectedCharacter.selected_artist_name ?? selectedArtistFromQuery,
      reference_image_urls: (selectedCharacter.reference_image_urls ?? []).join("\n"),
      bust_size: selectedCharacter.bust_size ?? "",
      is_anonymous: selectedCharacter.is_anonymous ?? false,
    });
  }, [selectedCharacter, selectedArtistFromQuery]);

  const handleFieldChange = <K extends keyof CharacterForm>(key: K, value: CharacterForm[K]) => {
    setCharacterForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStatus({ type: "error", message: "Supabase 尚未設定，請先設定 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY。" });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("請先登入後再建立/提交角色周邊訂製。 ");
      }

      const normalizedUserId = normalizeNullableId(user.id);
      if (!normalizedUserId) {
        throw new Error("使用者識別失敗，請重新登入後再試。 ");
      }

      const characterPayload = {
        user_id: normalizedUserId,
        character_name: characterForm.character_name.trim() || "未命名角色",
        character_gender: characterForm.character_gender.trim() || null,
        personality_tags: parseTags(characterForm.personality_tags),
        bio: characterForm.bio.trim() || null,
        hairstyle: characterForm.hairstyle.trim() || null,
        hair_color: characterForm.hair_color.trim() || null,
        eye_style: characterForm.eyestyle.trim() || null,
        eye_color: characterForm.eye_color.trim() || null,
        height_body_type: characterForm.height_body_type.trim() || null,
        bust_size: characterForm.bust_size.trim() || null,
        theme_color: characterForm.theme_color.trim() || null,
        outfit_accessories: characterForm.outfit_accessories.trim() || null,
        additional_notes: characterForm.additional_notes.trim() || null,
        selected_artist_name: characterForm.selected_artist_name.trim() || null,
        reference_image_urls: parseReferenceUrls(characterForm.reference_image_urls),
        is_anonymous: characterForm.is_anonymous,
        status: "draft",
      };

      let characterId = selectedCharacterId;

      if (selectedCharacterId) {
        const { error: updateError } = await supabase
          .from("characters")
          .update(characterPayload)
          .eq("id", selectedCharacterId)
          .select("id")
          .single();

        if (updateError) {
          throw new Error(`更新角色失敗：${updateError.message}`);
        }
      } else {
        const { data, error: insertError } = await supabase
          .from("characters")
          .insert([{ ...characterPayload }])
          .select("id")
          .single();

        if (insertError || !data?.id) {
          throw new Error(`新增角色失敗：${insertError?.message ?? "角色 ID 不存在"}`);
        }

        characterId = data.id;
      }

      const orderPayload = {
        user_id: normalizedUserId,
        character_id: characterId,
        merch_type: merchType.trim() || "周邊商品",
        pose: requirements.trim() || "未填寫姿勢需求",
        expression: "未填寫表情需求",
        background_scene: "未填寫背景場景需求",
        recipient_name: "未填寫收件人姓名",
        phone: "未填寫聯絡電話",
        shipping_address: {
          address: shippingAddress.trim() || "未填寫地址",
          recipient_name: "未填寫收件人姓名",
          phone: "未填寫聯絡電話",
        },
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const { error: orderError } = await supabase.from("orders").insert([orderPayload]);
      if (orderError) {
        throw new Error(`建立周邊訂單失敗：${orderError.message}`);
      }

      setStatus({ type: "success", message: "角色與周邊訂單已成功建立，已同步到 characters / orders 表。" });
      setTimeout(() => router.push("/orders"), 600);
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "送出失敗，請稍後重試。",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <section className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            Merchandise Customization Form
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">角色周邊訂製</h1>
          <p className="mt-3 max-w-3xl text-slate-600">Step 1：選擇既有角色或填寫角色屬性；Step 2：輸入周邊類型、需求與寄送資訊並送出。</p>
        </section>

        {status ? (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {status.type === "success" ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <AlertCircle className="mr-2 inline h-4 w-4" />}
            {status.message}
          </div>
        ) : null}

        <section className="mt-6 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                <h2 className="text-xl font-black text-slate-900">Step 1. 選擇角色</h2>
                <p className="mt-2 text-sm text-slate-600">可選擇既有角色，或直接輸入新角色資料，系統會在提交時同步寫入 characters 表。</p>

                {isLoadingCharacters ? (
                  <div className="mt-4 flex items-center gap-2 text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    讀取角色列表中...
                  </div>
                ) : existingCharacters.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCharacterId("")}
                      className={`rounded-2xl border p-3 text-left ${!selectedCharacterId ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"}`}
                    >
                      <p className="font-bold text-slate-900">建立新角色</p>
                      <p className="mt-1 text-xs text-slate-500">手動填寫完整角色屬性</p>
                    </button>

                    {existingCharacters.map((character) => (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => setSelectedCharacterId(character.id)}
                        className={`rounded-2xl border p-3 text-left ${selectedCharacterId === character.id ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"}`}
                      >
                        <p className="font-bold text-slate-900">{character.character_name || "未命名角色"}</p>
                        <p className="mt-1 text-xs text-slate-500">{character.character_gender ?? "未填寫性別"}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>角色名稱</span>
                  <input
                    value={characterForm.character_name}
                    onChange={(event) => handleFieldChange("character_name", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="例如：月白"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>角色性別</span>
                  <input
                    value={characterForm.character_gender}
                    onChange={(event) => handleFieldChange("character_gender", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="女性 / 男性 / 其他"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>髮色</span>
                  <input type="color" value={characterForm.hair_color} onChange={(event) => handleFieldChange("hair_color", event.target.value)} className="h-12 w-full rounded-2xl border border-sky-200 bg-sky-50/40 p-1" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>眼色</span>
                  <input type="color" value={characterForm.eye_color} onChange={(event) => handleFieldChange("eye_color", event.target.value)} className="h-12 w-full rounded-2xl border border-sky-200 bg-sky-50/40 p-1" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                  <span>性格標籤</span>
                  <input
                    value={characterForm.personality_tags}
                    onChange={(event) => handleFieldChange("personality_tags", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="如：可愛、活潑、穩定"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                  <span>角色簡介 / Bio</span>
                  <textarea
                    rows={3}
                    value={characterForm.bio}
                    onChange={(event) => handleFieldChange("bio", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="角色背景、定位與氣質描述"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>髮型</span>
                  <input
                    value={characterForm.hairstyle}
                    onChange={(event) => handleFieldChange("hairstyle", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="長髮 / 馬尾 / 短髮"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>眼型</span>
                  <input
                    value={characterForm.eyestyle}
                    onChange={(event) => handleFieldChange("eyestyle", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="大眼 / 升旗眼 / 眼神柔和"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>身高 / 體型</span>
                  <input
                    value={characterForm.height_body_type}
                    onChange={(event) => handleFieldChange("height_body_type", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="163cm / 纖細骨架"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>胸圍 / bust size</span>
                  <input
                    value={characterForm.bust_size}
                    onChange={(event) => handleFieldChange("bust_size", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="B / C / 82cm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>主題色</span>
                  <input type="color" value={characterForm.theme_color} onChange={(event) => handleFieldChange("theme_color", event.target.value)} className="h-12 w-full rounded-2xl border border-sky-200 bg-sky-50/40 p-1" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>選擇繪師</span>
                  <input
                    value={characterForm.selected_artist_name}
                    onChange={(event) => handleFieldChange("selected_artist_name", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="繪師名稱（可選）"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                  <span>服裝設定 / 配件</span>
                  <textarea
                    rows={3}
                    value={characterForm.outfit_accessories}
                    onChange={(event) => handleFieldChange("outfit_accessories", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="制服、配件、風格描述"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                  <span>額外備註</span>
                  <textarea
                    rows={3}
                    value={characterForm.additional_notes}
                    onChange={(event) => handleFieldChange("additional_notes", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="繪師備註、特殊要求"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                  <span>參考圖網址（可換行輸入）</span>
                  <textarea
                    rows={3}
                    value={characterForm.reference_image_urls}
                    onChange={(event) => handleFieldChange("reference_image_urls", event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="https://...\nhttps://..."
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                  <input type="checkbox" checked={characterForm.is_anonymous} onChange={(event) => handleFieldChange("is_anonymous", event.target.checked)} />
                  匿名委託（匿名）
                </label>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 font-semibold text-white">
                  下一步 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-slate-900">Step 2. 周邊需求與寄送</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>周邊類型</span>
                  <select
                    value={merchType}
                    onChange={(event) => setMerchType(event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                  >
                    <option value="壓克力立牌">壓克力立牌</option>
                    <option value="掛軸">掛軸</option>
                    <option value="Q版周邊">Q版周邊</option>
                    <option value="明信片">明信片</option>
                    <option value="服裝">服裝</option>
                    <option value="其他">其他</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>收件地址</span>
                  <input
                    value={shippingAddress}
                    onChange={(event) => setShippingAddress(event.target.value)}
                    className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                    placeholder="收件地址"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>客製化需求說明</span>
                <textarea
                  rows={6}
                  value={requirements}
                  onChange={(event) => setRequirements(event.target.value)}
                  className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 focus:border-sky-400 focus:outline-none"
                  placeholder="請描述周邊尺寸、顏色、材質、風格、印刷方式、客製需求…"
                />
              </label>

              <div className="rounded-[24px] border border-sky-100 bg-sky-50/30 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-900">送出前摘要</p>
                <div className="mt-3 space-y-2">
                  <div>角色：{characterForm.character_name || "未命名角色"}</div>
                  <div>角色性別：{characterForm.character_gender || "未填寫"}</div>
                  <div>繪師：{characterForm.selected_artist_name || "未指定"}</div>
                  <div>周邊類型：{merchType}</div>
                  <div>需求：{requirements || "未填寫"}</div>
                  <div>寄送地址：{shippingAddress || "未填寫"}</div>
                </div>
              </div>

              <div className="flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700">
                  上一步
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "送出中…" : "確認送出"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-600">載入預約表單中...</div>}>
      <NewOrderPageContent />
    </Suspense>
  );
}
