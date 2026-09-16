"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import FileUploadField from "@/src/components/FileUploadField";
import { uploadFileToBucket } from "@/src/lib/artist-data";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type CharacterStatus = "draft" | "in_progress" | "completed" | string;

type CharacterRecord = {
  id: string;
  user_id: string;
  artist_id: string | null;
  name: string;
  gender: string | null;
  status: CharacterStatus | null;
  personality_tags: string[] | null;
  bio: string | null;
  appearance_details: Record<string, unknown> | null;
  image_urls: string[] | null;
  character_sheet_url: string | null;
  character_icon_url: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
};

type Props = {
  orderId: string;
};

const DELIVERY_BUCKETS = ["completed-assets", "character-references"] as const;

function normalizeStatus(status: string | null) {
  if (status === "completed") {
    return "completed";
  }
  if (status === "in_progress") {
    return "in_progress";
  }
  return "draft";
}

function getStatusConfig(status: string | null) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "completed") {
    return {
      label: "已完成",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (normalizedStatus === "in_progress") {
    return {
      label: "繪製中",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  return {
    label: "待接單",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function formatDateTime(iso: string) {
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

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

export default function ArtistOrderDetailView({ orderId }: Props) {
  const router = useRouter();
  const [character, setCharacter] = useState<CharacterRecord | null>(null);
  const [clientName, setClientName] = useState("未命名客戶");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [characterSheetFiles, setCharacterSheetFiles] = useState<File[]>([]);
  const [characterIconFiles, setCharacterIconFiles] = useState<File[]>([]);
  const [artistUserId, setArtistUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) {
        if (!cancelled) {
          setErrorMessage("Supabase 尚未設定，無法讀取委託資料。");
          setLoading(false);
        }
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (authError || !user) {
        router.replace(`/login?redirectTo=${encodeURIComponent(`/artist/orders/${orderId}`)}`);
        return;
      }

      setArtistUserId(user.id);

      const { data, error } = await supabase
        .from("characters")
        .select("id,user_id,artist_id,name,gender,status,personality_tags,bio,appearance_details,image_urls,character_sheet_url,character_icon_url,created_at")
        .eq("id", orderId)
        .eq("artist_id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        setErrorMessage(`讀取委託失敗：${error.message}`);
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("查無此委託，或你沒有權限查看這筆資料。");
        setLoading(false);
        return;
      }

      setCharacter(data as CharacterRecord);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id,full_name,display_name")
        .eq("id", (data as CharacterRecord).user_id)
        .maybeSingle();

      if (!cancelled && profile) {
        const clientProfile = profile as ProfileRow;
        setClientName(clientProfile.display_name ?? clientProfile.full_name ?? "未命名客戶");
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId, router]);

  const appearance = useMemo(() => character?.appearance_details ?? null, [character]);
  const deliveryAssetUrls = useMemo(
    () => parseStringArray(appearance?.delivery_asset_urls),
    [appearance],
  );
  const currentCharacterSheetUrl = character?.character_sheet_url?.trim() || "";
  const currentCharacterIconUrl = character?.character_icon_url?.trim() || "";
  const referenceImageUrls = useMemo(() => {
    const explicitReferenceUrls = parseStringArray(appearance?.reference_image_urls);
    const allImageUrls = parseStringArray(character?.image_urls ?? []);

    if (explicitReferenceUrls.length > 0) {
      return explicitReferenceUrls;
    }

    return allImageUrls.filter((url) => !deliveryAssetUrls.includes(url));
  }, [appearance, character?.image_urls, deliveryAssetUrls]);

  const handleConfirmDelivery = async () => {
    if (!character || !artistUserId) {
      return;
    }

    if (characterSheetFiles.length === 0 && !currentCharacterSheetUrl) {
      setErrorMessage("請先上傳角色三視圖，再確認交付。");
      return;
    }

    if (characterIconFiles.length === 0 && !currentCharacterIconUrl) {
      setErrorMessage("請先上傳角色臉部頭像/Icon，再確認交付。");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMessage("Supabase 尚未設定，無法上傳交稿檔案。");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let nextCharacterSheetUrl = currentCharacterSheetUrl;
      let nextCharacterIconUrl = currentCharacterIconUrl;

      if (characterSheetFiles[0]) {
        const file = characterSheetFiles[0];
        const path = `${artistUserId}/${character.id}/character-sheet-${Date.now()}-${file.name}`;
        const { publicUrl } = await uploadFileToBucket(supabase, DELIVERY_BUCKETS, file, path);
        nextCharacterSheetUrl = publicUrl;
      }

      if (characterIconFiles[0]) {
        const file = characterIconFiles[0];
        const path = `${artistUserId}/${character.id}/character-icon-${Date.now()}-${file.name}`;
        const { publicUrl } = await uploadFileToBucket(supabase, DELIVERY_BUCKETS, file, path);
        nextCharacterIconUrl = publicUrl;
      }

      const nextDeliveryUrls = uniqueStrings(
        [nextCharacterSheetUrl, nextCharacterIconUrl, ...deliveryAssetUrls].filter((url) => url.length > 0),
      );
      const nextReferenceUrls = uniqueStrings(referenceImageUrls);
      const nextImageUrls = uniqueStrings([...nextReferenceUrls, ...nextDeliveryUrls]);
      const nextAppearance = {
        ...(appearance ?? {}),
        reference_image_urls: nextReferenceUrls,
        delivery_asset_urls: nextDeliveryUrls,
        delivered_at: new Date().toISOString(),
        completed_by_artist_id: artistUserId,
      };

      const { error } = await supabase
        .from("characters")
        .update({
          status: "completed",
          character_sheet_url: nextCharacterSheetUrl,
          character_icon_url: nextCharacterIconUrl,
          image_urls: nextImageUrls,
          appearance_details: nextAppearance,
        })
        .eq("id", character.id)
        .eq("artist_id", artistUserId);

      if (error) {
        throw error;
      }

      setCharacter({
        ...character,
        status: "completed",
        character_sheet_url: nextCharacterSheetUrl,
        character_icon_url: nextCharacterIconUrl,
        image_urls: nextImageUrls,
        appearance_details: nextAppearance,
      });
      setCharacterSheetFiles([]);
      setCharacterIconFiles([]);
      setSuccessMessage("交稿完成，客戶端的角色資產庫已可讀取這筆完稿資料。");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "交稿失敗，請稍後再試。";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-5 py-4 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          載入委託資料中...
        </div>
      </main>
    );
  }

  if (errorMessage && !character) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/artist/orders" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
            <ArrowLeft className="h-4 w-4" />
            返回委託列表
          </Link>

          <section className="rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              讀取失敗
            </div>
            <h1 className="text-2xl font-black text-slate-900">無法顯示委託詳情</h1>
            <p className="mt-3 text-slate-600">{errorMessage}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!character) {
    return null;
  }

  const statusConfig = getStatusConfig(character.status);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/artist/orders" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回委託列表
        </Link>

        <section className="mb-6 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                客戶委託詳情
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{character.name}</h1>
              <p className="mt-3 text-sm text-slate-600">客戶名稱：{clientName}</p>
              <p className="mt-1 text-sm text-slate-600">下單時間：{formatDateTime(character.created_at)}</p>
            </div>

            <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          </div>
        </section>

        {errorMessage ? (
          <section className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </section>
        ) : null}

        {successMessage ? (
          <section className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
            <span>{successMessage}</span>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">角色設定與文字需求</h2>
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
                        <span key={tag} className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-800">未設定</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">背景故事 / 補充描述</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-800">{character.bio || "未設定"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">服裝 / 配件</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-800">{readAppearanceText(appearance, "outfit_accessories")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">額外需求</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-800">{readAppearanceText(appearance, "additional_notes")}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">外觀屬性</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-500">髮型</dt>
                  <dd className="mt-1 text-slate-800">{readAppearanceText(appearance, "hairstyle")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">髮色</dt>
                  <dd className="mt-1 text-slate-800">{readAppearanceText(appearance, "hair_color")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">眼睛風格</dt>
                  <dd className="mt-1 text-slate-800">{readAppearanceText(appearance, "eye_style")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">眼睛顏色</dt>
                  <dd className="mt-1 text-slate-800">{readAppearanceText(appearance, "eye_color")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">身高 / 體型</dt>
                  <dd className="mt-1 text-slate-800">{readAppearanceText(appearance, "height_body_type")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">代表色</dt>
                  <dd className="mt-1 text-slate-800">{readAppearanceText(appearance, "theme_color")}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">客戶參考圖</h2>
              {referenceImageUrls.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {referenceImageUrls.map((url, index) => (
                    <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/50 transition hover:shadow-md">
                      <img src={url} alt={`參考圖 ${index + 1}`} className="h-44 w-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">客戶尚未附上參考圖。</p>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-sky-600" />
                <h2 className="text-lg font-black text-slate-900">作品交付</h2>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                請分別上傳角色三視圖與角色 Icon。完成交付後，系統會同步更新客戶端角色縮圖與正式角色圖像。
              </p>

              <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-900">上傳角色三視圖</p>
                <FileUploadField
                  id="artist-order-character-sheet-upload"
                  accept="image/*"
                  files={characterSheetFiles}
                  onFilesChange={setCharacterSheetFiles}
                  buttonText="上傳角色三視圖"
                  emptyText="尚未選擇角色三視圖"
                />
                {currentCharacterSheetUrl ? (
                  <a
                    href={currentCharacterSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block overflow-hidden rounded-2xl border border-sky-100 bg-white transition hover:shadow-md"
                  >
                    <img src={currentCharacterSheetUrl} alt="目前角色三視圖" className="h-40 w-full object-cover" />
                    <div className="px-4 py-3 text-sm font-medium text-sky-700">檢視目前角色三視圖</div>
                  </a>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-900">上傳角色臉部頭像 / Icon</p>
                <FileUploadField
                  id="artist-order-character-icon-upload"
                  accept="image/*"
                  files={characterIconFiles}
                  onFilesChange={setCharacterIconFiles}
                  buttonText="上傳角色 Icon"
                  emptyText="尚未選擇角色 Icon"
                />
                {currentCharacterIconUrl ? (
                  <a
                    href={currentCharacterIconUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block overflow-hidden rounded-2xl border border-sky-100 bg-white transition hover:shadow-md"
                  >
                    <img src={currentCharacterIconUrl} alt="目前角色 Icon" className="h-40 w-full object-cover" />
                    <div className="px-4 py-3 text-sm font-medium text-sky-700">檢視目前角色 Icon</div>
                  </a>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleConfirmDelivery}
                disabled={submitting}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? "交付中..." : "完成交付"}
              </button>
            </section>

            <section className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">已上傳完稿成果</h2>
              {currentCharacterSheetUrl || currentCharacterIconUrl ? (
                <div className="mt-4 space-y-3">
                  {currentCharacterIconUrl ? (
                    <a
                      href={currentCharacterIconUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-sky-100 bg-slate-50 transition hover:shadow-md"
                    >
                      <img src={currentCharacterIconUrl} alt="角色 Icon" className="h-40 w-full object-cover" />
                      <div className="px-4 py-3 text-sm font-medium text-sky-700">角色 Icon</div>
                    </a>
                  ) : null}
                  {currentCharacterSheetUrl ? (
                    <a
                      href={currentCharacterSheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-sky-100 bg-slate-50 transition hover:shadow-md"
                    >
                      <img src={currentCharacterSheetUrl} alt="角色三視圖" className="h-40 w-full object-cover" />
                      <div className="px-4 py-3 text-sm font-medium text-sky-700">角色三視圖</div>
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">尚未上傳任何完稿成果。</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
