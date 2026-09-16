"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import FileUploadField from "@/src/components/FileUploadField";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type ToastState = {
  type: "success" | "error";
  message: string;
};

type FormState = {
  name: string;
  gender: string;
  personalityText: string;
  bio: string;
  hairstyle: string;
  hairColor: string;
  eyeStyle: string;
  eyeColor: string;
  heightBodyType: string;
  themeColor: string;
  outfitAccessories: string;
  additionalNotes: string;
  isPublicPortfolio: boolean;
};

type ArtistProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  style_tags?: string[];
  surcharge_multiplier?: number;
};

const PERSONALITY_PRESETS = ["傲嬌", "病嬌", "溫柔", "天然", "腹黑", "元氣", "理性", "冷酷"];
const STORAGE_BUCKET_CANDIDATES = ["character-references", "order-assets", "artist-assets"];

const initialForm: FormState = {
  name: "",
  gender: "",
  personalityText: "",
  bio: "",
  hairstyle: "",
  hairColor: "#000000",
  eyeStyle: "",
  eyeColor: "#000000",
  heightBodyType: "",
  themeColor: "#4ea8de",
  outfitAccessories: "",
  additionalNotes: "",
  isPublicPortfolio: true,
};

function buildStoragePath(userId: string, file: File, index: number) {
  const sanitizedName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  return `${userId}/${Date.now()}-${index}-${sanitizedName || "reference-image"}`;
}

export default function CharacterDNAForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [flowStep, setFlowStep] = useState<"form" | "artist">("form");
  const [form, setForm] = useState<FormState>(initialForm);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [artistsError, setArtistsError] = useState("");
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const personalityInputRef = useRef<HTMLInputElement | null>(null);

  const previewUrls = useMemo(
    () =>
      referenceFiles
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => URL.createObjectURL(file)),
    [referenceFiles],
  );

  const canNextStep1 = form.name.trim().length > 0;

  const stepTitle = useMemo(() => {
    if (flowStep === "artist") return "選擇執筆繪師";
    if (step === 1) return "基本身份與性格";
    return "外觀細節與參考素材";
  }, [flowStep, step]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const appendPresetToPersonality = (tag: string) => {
    setForm((current) => {
      const existingText = current.personalityText.trim();
      const nextText = existingText ? `${existingText}, ${tag}` : tag;
      return {
        ...current,
        personalityText: nextText,
      };
    });

    window.setTimeout(() => {
      personalityInputRef.current?.focus();
    }, 0);
  };

  const showToast = (type: ToastState["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 2600);
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    let cancelled = false;

    const loadArtists = async () => {
      if (flowStep !== "artist") {
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        if (!cancelled) {
          setArtistsError("Supabase 尚未設定，無法載入繪師名單。");
        }
        return;
      }

      setArtistsLoading(true);
      setArtistsError("");

      const detailedQuery = await supabase
        .from("profiles")
        .select("id,full_name,avatar_url,bio,role,style_tags,surcharge_multiplier")
        .or("role.eq.ARTIST,role.eq.artist,role.ilike.%artist%");

      let data: Record<string, unknown>[] | null =
        (detailedQuery.data as unknown as Record<string, unknown>[] | null) ?? null;
      let error = detailedQuery.error;

      // Fallback query for older schemas without style_tags / surcharge_multiplier.
      if (error && /style_tags|surcharge_multiplier/i.test(error.message)) {
        const basicQuery = await supabase
          .from("profiles")
          .select("id,full_name,avatar_url,bio,role")
          .or("role.eq.ARTIST,role.eq.artist,role.ilike.%artist%");
        data = (basicQuery.data as unknown as Record<string, unknown>[] | null) ?? null;
        error = basicQuery.error;
      }

      if (cancelled) {
        return;
      }

      if (error) {
        setArtistsError(`載入繪師列表失敗：${error.message}`);
        setArtistsLoading(false);
        return;
      }

      const normalizedArtists = (data ?? []).map((row) => {
        return {
          id: String(row.id ?? ""),
          full_name: typeof row.full_name === "string" ? row.full_name : null,
          avatar_url: typeof row.avatar_url === "string" ? row.avatar_url : null,
          bio: typeof row.bio === "string" ? row.bio : null,
          role: typeof row.role === "string" ? row.role : null,
          style_tags: Array.isArray(row.style_tags)
            ? row.style_tags.filter((tag): tag is string => typeof tag === "string")
            : [],
          surcharge_multiplier:
            typeof row.surcharge_multiplier === "number" ? row.surcharge_multiplier : 1,
        } satisfies ArtistProfile;
      });

      setArtists(normalizedArtists.filter((artist) => artist.id));
      setArtistsLoading(false);
    };

    void loadArtists();

    return () => {
      cancelled = true;
    };
  }, [flowStep]);

  const uploadReferenceFiles = async (userId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase 未設定，無法上傳參考圖。請檢查環境變數。");
    }

    if (referenceFiles.length === 0) {
      return [] as string[];
    }

    for (const bucket of STORAGE_BUCKET_CANDIDATES) {
      const urls: string[] = [];
      let bucketFailed = false;

      for (let index = 0; index < referenceFiles.length; index += 1) {
        const file = referenceFiles[index];
        const path = buildStoragePath(userId, file, index);
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: true,
          contentType: file.type || "application/octet-stream",
        });

        if (uploadError) {
          bucketFailed = true;
          break;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        if (!data.publicUrl) {
          bucketFailed = true;
          break;
        }

        urls.push(data.publicUrl);
      }

      if (!bucketFailed && urls.length === referenceFiles.length) {
        return urls;
      }
    }

    throw new Error("參考圖上傳失敗。請確認 Supabase Storage bucket 已建立，或聯繫管理員。");
  };

  const goNext = () => {
    if (step === 1 && !canNextStep1) {
      showToast("error", "請先填寫角色名稱。");
      return;
    }
    setStep((current) => Math.min(2, current + 1));
  };

  const goBack = () => {
    setStep((current) => Math.max(1, current - 1));
  };

  const handleCreateCharacter = async (selectedArtist: ArtistProfile) => {
    if (!form.name.trim()) {
      setStep(1);
      showToast("error", "角色名稱為必填欄位。");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      showToast("error", "Supabase 尚未設定，請先設定環境變數。");
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login?redirectTo=%2Fcharacters%2Fcreate");
        return;
      }

      const imageUrls = await uploadReferenceFiles(user.id);

      const normalizedName = form.name.trim();
      const normalizedGender = form.gender.trim() || null;
      const normalizedBio = form.bio.trim() || null;
      const normalizedPersonalityText = form.personalityText.trim();
      const normalizedPersonalityTags = normalizedPersonalityText
        ? normalizedPersonalityText
            .split(/[\s,，、]+/)
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : [];
      const normalizedHairstyle = form.hairstyle.trim() || null;
      const normalizedHairColor = form.hairColor || "#000000";
      const normalizedEyeStyle = form.eyeStyle.trim() || null;
      const normalizedEyeColor = form.eyeColor || "#000000";
      const normalizedHeightBodyType = form.heightBodyType.trim() || null;
      const normalizedThemeColor = form.themeColor || "#4ea8de";
      const normalizedOutfitAccessories = form.outfitAccessories.trim() || null;
      const normalizedAdditionalNotes = form.additionalNotes.trim() || null;
      const normalizedArtistName = selectedArtist.full_name?.trim() || null;
      const normalizedImageUrls = Array.isArray(imageUrls)
        ? imageUrls.filter((url): url is string => typeof url === "string" && url.length > 0)
        : [];

      const appearanceDetails = {
        hairstyle: normalizedHairstyle,
        hair_color: normalizedHairColor,
        eye_style: normalizedEyeStyle,
        eye_color: normalizedEyeColor,
        height_body_type: normalizedHeightBodyType,
        theme_color: normalizedThemeColor,
        outfit_accessories: normalizedOutfitAccessories,
        additional_notes: normalizedAdditionalNotes,
        selected_artist_id: selectedArtist.id,
        selected_artist_name: normalizedArtistName,
        is_public_portfolio: form.isPublicPortfolio,
        reference_image_urls: normalizedImageUrls,
      };

      const { data: insertedCharacter, error: insertError } = await supabase
        .from("characters")
        .insert({
          user_id: user.id,
          artist_id: selectedArtist.id,
          status: "draft",
          name: normalizedName,
          gender: normalizedGender,
          personality_tags: normalizedPersonalityTags,
          bio: normalizedBio,
          hairstyle: normalizedHairstyle,
          hair_color: normalizedHairColor,
          eye_style: normalizedEyeStyle,
          eye_color: normalizedEyeColor,
          height_body_type: normalizedHeightBodyType,
          theme_color: normalizedThemeColor,
          outfit_accessories: normalizedOutfitAccessories,
          additional_notes: normalizedAdditionalNotes,
          selected_artist_name: normalizedArtistName,
          is_public_portfolio: form.isPublicPortfolio,
          appearance_details: appearanceDetails,
          image_urls: normalizedImageUrls,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      showToast("success", "角色與繪師綁定成功，正在前往角色詳情頁...");

      const targetPath = insertedCharacter?.id ? `/characters/${insertedCharacter.id}` : "/characters";
      window.setTimeout(() => {
        router.push(targetPath);
      }, 900);
    } catch (error) {
      console.error("Create character failed:", error);
      const message = error instanceof Error ? error.message : "角色建立失敗，請稍後再試。";
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenConfirm = () => {
    if (!form.name.trim()) {
      setStep(1);
      showToast("error", "角色名稱為必填欄位。");
      return;
    }

    setShowConfirmModal(true);
  };

  return (
    <section className="rounded-[32px] border border-sky-100 bg-white p-6 shadow-[0_20px_60px_rgba(14,116,144,0.08)] sm:p-8 lg:p-10">
      {toast ? (
        <div
          className={[
            "fixed right-4 top-4 z-[80] flex max-w-sm items-start gap-2 rounded-2xl border px-4 py-3 text-sm shadow-lg",
            toast.type === "success"
              ? "border-emerald-500/40 bg-emerald-50 text-emerald-700"
              : "border-rose-500/40 bg-rose-50 text-rose-700",
          ].join(" ")}
        >
          {toast.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <X className="mt-0.5 h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      ) : null}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            <Sparkles className="h-3.5 w-3.5" />
            Character DNA
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Step {step} / 2 ・ {stepTitle}</h2>
        </div>

        <div className="flex gap-2">
          {[1, 2].map((item) => (
            <div
              key={item}
              className={[
                "h-2.5 w-12 rounded-full transition",
                item <= step ? "bg-sky-500" : "bg-sky-100",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      {showConfirmModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/55 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[24px] border border-sky-100 bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">角色屬性確認</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">送出前請再次確認</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                aria-label="關閉確認視窗"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                <h4 className="text-sm font-black text-slate-900">基本身份與性格</h4>
                <p className="mt-2 text-sm text-slate-700">角色名稱：{form.name || "未填寫"}</p>
                <p className="mt-1 text-sm text-slate-700">性別 / 性向：{form.gender || "未填寫"}</p>
                <p className="mt-1 text-sm text-slate-700">
                  性格：{form.personalityText || "未設定"}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">背景故事：{form.bio || "未填寫"}</p>
              </article>

              <article className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                <h4 className="text-sm font-black text-slate-900">外觀與外貌細節</h4>
                <p className="mt-2 text-sm text-slate-700">發型：{form.hairstyle || "未填寫"}</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                  <span>髮色：</span>
                  <span className="inline-block h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: form.hairColor }} />
                  <span>{form.hairColor}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">瞳孔樣式：{form.eyeStyle || "未填寫"}</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                  <span>眼色：</span>
                  <span className="inline-block h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: form.eyeColor }} />
                  <span>{form.eyeColor}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">身高 / 體型：{form.heightBodyType || "未填寫"}</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                  <span>主題色：</span>
                  <span className="inline-block h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: form.themeColor }} />
                  <span>{form.themeColor}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">服裝與配件：{form.outfitAccessories || "未填寫"}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">特殊備註：{form.additionalNotes || "未填寫"}</p>
                <p className="mt-2 text-sm text-slate-700">
                  作品集公開授權：{form.isPublicPortfolio ? "已授權繪師收錄至公開作品集" : "不授權公開展示"}
                </p>
              </article>
            </div>

            <article className="mt-4 rounded-2xl border border-sky-100 bg-white p-4">
              <h4 className="text-sm font-black text-slate-900">參考圖片</h4>
              {previewUrls.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {previewUrls.map((url, index) => (
                    <img
                      key={`${url}-${index}`}
                      src={url}
                      alt={`參考圖預覽 ${index + 1}`}
                      className="h-28 w-full rounded-xl border border-slate-200 object-cover"
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">未上傳參考圖片</p>
              )}
            </article>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                返回修改
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setFlowStep("artist");
                }}
                className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                確認無誤，前往選擇繪師
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {flowStep === "form" && step === 1 ? (
        <div className="grid gap-6">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>角色名稱（必填）</span>
            <input
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="例如：夜色織夢"
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>性別 / 性向設定</span>
            <input
              value={form.gender}
              onChange={(event) => setField("gender", event.target.value)}
              placeholder="例如：女性、非二元、男性向、百合向"
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>

          <div className="grid gap-3 text-sm font-medium text-slate-700">
            <span>性格</span>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_PRESETS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => appendPresetToPersonality(tag)}
                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sky-300"
                >
                  {tag}
                </button>
              ))}
            </div>

            <input
              ref={personalityInputRef}
              value={form.personalityText}
              onChange={(event) => setField("personalityText", event.target.value)}
              placeholder="點擊上方標籤快速帶入，或在此自由輸入/補充性格描述..."
              className="w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>背景故事 / 簡介</span>
            <textarea
              value={form.bio}
              onChange={(event) => setField("bio", event.target.value)}
              rows={5}
              placeholder="描述角色經歷、世界觀或核心特質"
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>
        </div>
      ) : null}

      {flowStep === "form" && step === 2 ? (
        <div className="grid gap-6">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>發型</span>
            <input
              value={form.hairstyle}
              onChange={(event) => setField("hairstyle", event.target.value)}
              placeholder="例如：雙馬尾、短狼尾"
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>頭髮顏色</span>
            <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-2">
              <input
                type="color"
                value={form.hairColor}
                onChange={(event) => setField("hairColor", event.target.value)}
                className="h-11 w-16 cursor-pointer rounded-lg border border-sky-200 bg-transparent p-0"
              />
              <span className="font-mono text-slate-600">{form.hairColor}</span>
            </div>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>瞳孔形狀 / 風格</span>
            <input
              value={form.eyeStyle}
              onChange={(event) => setField("eyeStyle", event.target.value)}
              placeholder="例如：貓眼型、下垂眼"
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>眼睛顏色</span>
            <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-2">
              <input
                type="color"
                value={form.eyeColor}
                onChange={(event) => setField("eyeColor", event.target.value)}
                className="h-11 w-16 cursor-pointer rounded-lg border border-sky-200 bg-transparent p-0"
              />
              <span className="font-mono text-slate-600">{form.eyeColor}</span>
            </div>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>身高 / 體型</span>
            <input
              value={form.heightBodyType}
              onChange={(event) => setField("heightBodyType", event.target.value)}
              placeholder="例如：162cm、纖細偏運動型"
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>代表色 / 主題色</span>
            <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-2">
              <input
                type="color"
                value={form.themeColor}
                onChange={(event) => setField("themeColor", event.target.value)}
                className="h-11 w-16 cursor-pointer rounded-lg border border-sky-200 bg-transparent p-0"
              />
              <span className="font-mono text-slate-600">{form.themeColor}</span>
            </div>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>服裝風格與配件描述</span>
            <textarea
              value={form.outfitAccessories}
              onChange={(event) => setField("outfitAccessories", event.target.value)}
              rows={4}
              placeholder="例如：學院風外套、金屬胸針、長手套"
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>靈感 / 參考圖片上傳（可多選）</span>
            <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-4">
              <FileUploadField
                id="character-reference-images-upload"
                accept="image/*"
                multiple
                files={referenceFiles}
                onFilesChange={setReferenceFiles}
                buttonText="上傳多張圖片"
                emptyText="未選擇任何檔案"
              />
            </div>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>特殊備註 / 繪師注意事項</span>
            <textarea
              value={form.additionalNotes}
              onChange={(event) => setField("additionalNotes", event.target.value)}
              rows={5}
              placeholder="例如：希望偏明亮光影、避免過於寫實、保留左眼下淚痣"
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-4 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isPublicPortfolio}
              onChange={(event) => setField("isPublicPortfolio", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-sky-300 text-sky-600"
            />
            <span>
              <span className="block font-semibold text-slate-900">授權繪師收錄至個人公開作品集 (Portfolio Authorization)</span>
              <span className="mt-1 block text-slate-600">勾選後，繪師可在完稿後將此作品展示於個人作品集頁面。</span>
            </span>
          </label>
        </div>
      ) : null}

      {flowStep === "artist" ? (
        <section className="border-t border-sky-100 pt-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-black text-slate-900">挑選執筆繪師</h3>
              <p className="mt-1 text-sm text-slate-600">選擇繪師後，才會完成角色建立與繪師綁定。</p>
            </div>
            <button
              type="button"
              onClick={() => setFlowStep("form")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              返回表單修改
            </button>
          </div>

          {artistsLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              載入繪師資料中...
            </div>
          ) : null}

          {!artistsLoading && artistsError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{artistsError}</div>
          ) : null}

          {!artistsLoading && !artistsError && artists.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">目前沒有可選擇的繪師。</div>
          ) : null}

          {!artistsLoading && artists.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {artists.map((artist) => (
                <article key={artist.id} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    {artist.avatar_url ? (
                      <img
                        src={artist.avatar_url}
                        alt={artist.full_name ?? "artist avatar"}
                        className="h-12 w-12 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-sky-50 text-sky-700">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-black text-slate-900">{artist.full_name ?? "未命名繪師"}</h4>
                      <p className="text-xs uppercase tracking-[0.18em] text-sky-700">{artist.role ?? "ARTIST"}</p>
                    </div>
                  </div>

                  <p className="min-h-12 text-sm text-slate-600">{artist.bio || "尚未提供繪師簡介。"}</p>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p>風格標籤：{artist.style_tags?.length ? artist.style_tags.join("、") : "未設定"}</p>
                    <p>
                      加價係數：
                      {typeof artist.surcharge_multiplier === "number" ? `x${artist.surcharge_multiplier.toFixed(2)}` : "未設定"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      void handleCreateCharacter(artist);
                    }}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        建立中...
                      </>
                    ) : (
                      "選擇此繪師"
                    )}
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 pt-6">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            上一步
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:translate-y-[-1px]"
            >
              下一步：外觀與素材 ➔
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenConfirm}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
            >
              完成並建立角色 DNA
            </button>
          )}
        </div>
      )}
    </section>
  );
}