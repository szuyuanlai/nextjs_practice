"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type FlowStep = 1 | 2 | 3 | 4 | 5;

type CharacterOption = {
  id: string;
  character_name: string;
  status?: string | null;
  artist_id?: string | null;
};

type ArtistOption = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

type RequirementInput = {
  pose: string;
  expression: string;
  scene: string;
};

type ShippingInput = {
  name: string;
  phone: string;
  address: string;
};

type StatusMessage = {
  kind: "success" | "error";
  message: string;
};

const MERCH_OPTIONS = [
  "建模",
  "壓克力立牌",
  "掛軸",
  "靜態 CG",
  "動態 CG",
  "角色表情包",
  "角色 Q 版貼圖",
  "對話框",
  "AR 虛擬合照",
  "人形 1:1 立牌",
  "動畫短片",
];

function getArtistName(artist: ArtistOption) {
  const display = artist.display_name?.trim();
  if (display) return display;
  const full = artist.full_name?.trim();
  if (full) return full;
  return `繪師 #${artist.id.slice(0, 6)}`;
}

function normalizeNullableId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export default function ShopPage() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [loadingArtists, setLoadingArtists] = useState(false);

  const [selectedMerch, setSelectedMerch] = useState<string>(MERCH_OPTIONS[0]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("");

  const [requirements, setRequirements] = useState<RequirementInput>({
    pose: "",
    expression: "",
    scene: "",
  });
  const [shipping, setShipping] = useState<ShippingInput>({
    name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (!cancelled) {
          setStatusMessage({ kind: "error", message: "Supabase 尚未設定，無法使用周邊商店。" });
          setIsBootLoading(false);
        }
        return;
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !user) {
        router.replace("/login?redirectTo=%2Fshop");
        return;
      }

      setUserId(user.id);
      setIsBootLoading(false);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const fetchCharacters = async () => {
      if (step !== 2 || !userId) {
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) return;

      setLoadingCharacters(true);
      const { data, error } = await supabase
        .from("characters")
        .select("id,character_name,status,artist_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setStatusMessage({ kind: "error", message: `讀取角色失敗：${error.message}` });
        setCharacters([]);
      } else {
        const next = ((data ?? []) as CharacterOption[]).filter((row) => row.id && row.character_name);
        setCharacters(next);
        if (!selectedCharacterId && next[0]) {
          setSelectedCharacterId(next[0].id);
        }
      }

      setLoadingCharacters(false);
    };

    void fetchCharacters();
    return () => {
      cancelled = true;
    };
  }, [step, userId, selectedCharacterId]);

  useEffect(() => {
    let cancelled = false;

    const fetchArtists = async () => {
      if (step !== 3) {
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) return;

      setLoadingArtists(true);

      const detailed = await supabase
        .from("profiles")
        .select("id,full_name,display_name,avatar_url,role")
        .or("role.eq.ARTIST,role.eq.artist,role.ilike.%artist%")
        .order("full_name", { ascending: true });

      const rows = (detailed.data ?? []) as ArtistOption[];
      const queryError = detailed.error;

      if (cancelled) return;

      if (queryError) {
        setStatusMessage({ kind: "error", message: `讀取繪師失敗：${queryError.message}` });
        setArtists([]);
      } else {
        setArtists(rows);
        if (!selectedArtistId && rows[0]) {
          setSelectedArtistId(rows[0].id);
        }
      }

      setLoadingArtists(false);
    };

    void fetchArtists();
    return () => {
      cancelled = true;
    };
  }, [step, selectedArtistId]);

  const selectedCharacter = useMemo(
    () => characters.find((item) => item.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId],
  );

  const selectedArtist = useMemo(
    () => artists.find((item) => item.id === selectedArtistId) ?? null,
    [artists, selectedArtistId],
  );

  const canGoNext = useMemo(() => {
    if (step === 1) return Boolean(selectedMerch);
    if (step === 2) return Boolean(selectedCharacterId);
    if (step === 3) return Boolean(selectedArtistId);
    if (step === 4) {
      return (
        requirements.pose.trim().length > 0 &&
        requirements.expression.trim().length > 0 &&
        requirements.scene.trim().length > 0 &&
        shipping.name.trim().length > 0 &&
        shipping.phone.trim().length > 0 &&
        shipping.address.trim().length > 0
      );
    }
    return true;
  }, [step, selectedMerch, selectedCharacterId, selectedArtistId, requirements, shipping]);

  const gotoNext = () => {
    if (!canGoNext) return;
    setStep((current) => (current < 5 ? ((current + 1) as FlowStep) : current));
  };

  const gotoPrev = () => {
    setStep((current) => (current > 1 ? ((current - 1) as FlowStep) : current));
  };

  const handleSubmitOrder = async () => {
    if (!userId || !selectedCharacterId || !selectedArtistId) {
      setStatusMessage({ kind: "error", message: "請完整選擇周邊、角色與繪師。" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setStatusMessage({ kind: "error", message: "Supabase 尚未設定。" });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const normalizedUserId = normalizeNullableId(userId);
      const normalizedCharacterId = normalizeNullableId(selectedCharacterId);
      const normalizedArtistId = normalizeNullableId(selectedArtistId);

      if (!normalizedUserId || !normalizedCharacterId || !normalizedArtistId) {
        throw new Error("訂單資料不完整：使用者、角色或繪師識別碼無效。");
      }

      const payload = {
        user_id: normalizedUserId,
        character_id: normalizedCharacterId,
        merch_type: selectedMerch,
        requirements: {
          pose: requirements.pose.trim(),
          expression: requirements.expression.trim(),
          scene: requirements.scene.trim(),
          background_scene: requirements.scene.trim(),
        },
        shipping_address: {
          name: shipping.name.trim(),
          recipient_name: shipping.name.trim(),
          phone: shipping.phone.trim(),
          address: shipping.address.trim(),
        },
        status: "pending",
      };

      const { data, error } = await supabase.from("orders").insert([payload]).select().single();

      if (error) {
        throw error;
      }

      setStatusMessage({ kind: "success", message: "周邊訂單已送出，繪師將在後台查看並處理。" });
      setTimeout(() => {
        if (data?.id) {
          router.push(`/orders`);
        } else {
          router.push("/orders");
        }
      }, 700);
    } catch (error) {
      setStatusMessage({
        kind: "error",
        message: error instanceof Error ? error.message : "送出訂單失敗，請稍後重試。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <section className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            <ShoppingBag className="h-3.5 w-3.5" />
            Merchandise Flow
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">角色周邊商店</h1>
          <p className="mt-3 max-w-3xl text-slate-600">5 步驟完成周邊委託：挑商品、選角色、選繪師、填需求與地址、送出訂單。</p>
        </section>

        <section className="mt-6 rounded-[26px] border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-2 md:grid-cols-5">
            {["選商品", "選角色", "選繪師", "填需求", "送出"].map((label, index) => {
              const active = step === index + 1;
              return (
                <div
                  key={label}
                  className={[
                    "rounded-xl border px-3 py-2 text-center text-sm font-semibold",
                    active ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-500",
                  ].join(" ")}
                >
                  {index + 1}. {label}
                </div>
              );
            })}
          </div>
        </section>

        {statusMessage ? (
          <section
            className={[
              "mt-6 rounded-2xl border px-4 py-3 text-sm",
              statusMessage.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700",
            ].join(" ")}
          >
            {statusMessage.kind === "success" ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <AlertTriangle className="mr-2 inline h-4 w-4" />}
            {statusMessage.message}
          </section>
        ) : null}

        <section className="mt-6 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          {isBootLoading ? (
            <div className="flex min-h-[260px] items-center justify-center text-slate-600">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              載入商店資料中...
            </div>
          ) : (
            <>
              {step === 1 ? (
                <div>
                  <h2 className="text-xl font-black text-slate-900">Step 1. 選擇周邊商品</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {MERCH_OPTIONS.map((item) => {
                      const isActive = selectedMerch === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSelectedMerch(item)}
                          className={[
                            "rounded-2xl border p-4 text-left transition",
                            isActive
                              ? "border-sky-300 bg-sky-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/50",
                          ].join(" ")}
                        >
                          <p className="font-bold text-slate-900">{item}</p>
                          {item === "AR 虛擬合照" ? (
                            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                              ⚠️ 需要已完成角色建模才能解鎖此功能
                            </p>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div>
                  <h2 className="text-xl font-black text-slate-900">Step 2. 選擇已擁有角色</h2>
                  <p className="mt-2 text-sm text-slate-600">僅能選擇 1 隻角色綁定本次周邊委託。</p>
                  {loadingCharacters ? (
                    <div className="mt-5 flex items-center text-slate-600">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      載入角色列表中...
                    </div>
                  ) : characters.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-6 text-sm text-slate-600">
                      目前沒有角色資料，請先到角色建立頁新增角色。
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {characters.map((character) => {
                        const selected = selectedCharacterId === character.id;
                        return (
                          <button
                            key={character.id}
                            type="button"
                            onClick={() => setSelectedCharacterId(character.id)}
                            className={[
                              "rounded-2xl border px-4 py-3 text-left",
                              selected ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white",
                            ].join(" ")}
                          >
                            <p className="font-bold text-slate-900">{character.character_name}</p>
                            <p className="mt-1 text-xs text-slate-500">狀態：{character.status ?? "draft"}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <h2 className="text-xl font-black text-slate-900">Step 3. 選擇執筆繪師</h2>
                  {loadingArtists ? (
                    <div className="mt-5 flex items-center text-slate-600">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      載入繪師列表中...
                    </div>
                  ) : artists.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-6 text-sm text-slate-600">
                      目前沒有可選擇的繪師。
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {artists.map((artist) => {
                        const selected = selectedArtistId === artist.id;
                        const artistName = getArtistName(artist);
                        return (
                          <button
                            key={artist.id}
                            type="button"
                            onClick={() => setSelectedArtistId(artist.id)}
                            className={[
                              "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left",
                              selected ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white",
                            ].join(" ")}
                          >
                            <div className="h-12 w-12 overflow-hidden rounded-full border border-sky-100 bg-sky-50">
                              {artist.avatar_url ? (
                                <img src={artist.avatar_url} alt={artistName} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-black text-sky-700">
                                  {artistName.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{artistName}</p>
                              <p className="text-xs text-slate-500">{artist.role ?? "ARTIST"}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {step === 4 ? (
                <div>
                  <h2 className="text-xl font-black text-slate-900">Step 4. 填寫需求與寄送地址</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      <span>姿勢描述 (pose)</span>
                      <textarea
                        rows={4}
                        value={requirements.pose}
                        onChange={(event) => setRequirements((current) => ({ ...current, pose: event.target.value }))}
                        className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 outline-none transition focus:border-sky-400"
                        placeholder="例如：半身站姿、右手比讚"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      <span>表情描述 (expression)</span>
                      <textarea
                        rows={4}
                        value={requirements.expression}
                        onChange={(event) => setRequirements((current) => ({ ...current, expression: event.target.value }))}
                        className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 outline-none transition focus:border-sky-400"
                        placeholder="例如：微笑、眨眼"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                      <span>背景場景描述 (background_scene)</span>
                      <textarea
                        rows={4}
                        value={requirements.scene}
                        onChange={(event) => setRequirements((current) => ({ ...current, scene: event.target.value }))}
                        className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 outline-none transition focus:border-sky-400"
                        placeholder="例如：夕陽海邊、霓虹城市"
                      />
                    </label>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      <span>收件人姓名 (recipient_name)</span>
                      <input
                        value={shipping.name}
                        onChange={(event) => setShipping((current) => ({ ...current, name: event.target.value }))}
                        className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 outline-none transition focus:border-sky-400"
                        placeholder="王小明"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      <span>聯絡電話 (phone)</span>
                      <input
                        value={shipping.phone}
                        onChange={(event) => setShipping((current) => ({ ...current, phone: event.target.value }))}
                        className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 outline-none transition focus:border-sky-400"
                        placeholder="09xxxxxxxx"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                      <span>寄送地址 (shipping_address)</span>
                      <input
                        value={shipping.address}
                        onChange={(event) => setShipping((current) => ({ ...current, address: event.target.value }))}
                        className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-2 outline-none transition focus:border-sky-400"
                        placeholder="台北市..."
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {step === 5 ? (
                <div>
                  <h2 className="text-xl font-black text-slate-900">Step 5. 送出訂單</h2>
                  <div className="mt-4 grid gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 text-sm text-slate-700">
                    <div>周邊類型：{selectedMerch}</div>
                    <div>角色：{selectedCharacter?.character_name ?? "-"}</div>
                    <div>繪師：{selectedArtist ? getArtistName(selectedArtist) : "-"}</div>
                    <div>姿勢描述：{requirements.pose || "-"}</div>
                    <div>表情描述：{requirements.expression || "-"}</div>
                    <div>場景背景：{requirements.scene || "-"}</div>
                    <div>收件人：{shipping.name || "-"}</div>
                    <div>電話：{shipping.phone || "-"}</div>
                    <div>地址：{shipping.address || "-"}</div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    className="mt-5 inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSubmitting ? "送出中..." : "確認送出周邊訂單"}
                  </button>
                </div>
              ) : null}

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={gotoPrev}
                  disabled={step === 1}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ArrowLeft className="h-4 w-4" />
                  上一步
                </button>

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={gotoNext}
                    disabled={!canGoNext}
                    className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    下一步
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
