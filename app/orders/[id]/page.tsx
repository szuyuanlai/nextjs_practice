"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

type OrderStatus = "pending" | "approved" | "rejected" | "completed";

type OrderRow = {
  id: string;
  user_id: string;
  character_id?: string | null;
  character_name: string;
  personality: string;
  appearance_description: string;
  body_size: string;
  hair_color: string;
  eye_color: string;
  notes: string | null;
  status: OrderStatus;
  created_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
};

type CharacterRow = {
  id: string;
  name: string;
  gender: string | null;
  personality_tags: string[] | null;
  bio: string | null;
  hairstyle: string | null;
  hair_color: string | null;
  eye_style: string | null;
  eye_color: string | null;
  height_body_type: string | null;
  bust_size: string | null;
  outfit_accessories: string | null;
  additional_notes: string | null;
  selected_artist_name: string | null;
  appearance_details: Record<string, unknown> | null;
  created_at: string;
};

type Props = {
  params: Promise<{ id: string }>;
};

const statusMap: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "待處理", color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "已批准", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "已拒絕", color: "bg-rose-100 text-rose-700 border-rose-200" },
  completed: { label: "已完成", color: "bg-sky-100 text-sky-700 border-sky-200" },
};

export default function OrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [character, setCharacter] = useState<CharacterRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!supabase) {
        setError("Supabase 尚未設定，請先加入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
        setIsLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.replace(`/login?redirectTo=${encodeURIComponent(`/orders/${id}`)}`);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (queryError) {
        setError(queryError.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError("找不到這筆訂單，或你沒有查看權限。");
        setIsLoading(false);
        return;
      }

      const orderData = data as OrderRow;
      setOrder(orderData);

      const characterQuery = orderData.character_id
        ? supabase
            .from("characters")
            .select("id,name,gender,personality_tags,bio,hairstyle,hair_color,eye_style,eye_color,height_body_type,bust_size,outfit_accessories,additional_notes,selected_artist_name,appearance_details,created_at")
            .eq("id", orderData.character_id)
            .eq("user_id", authData.user.id)
            .maybeSingle()
        : supabase
            .from("characters")
            .select("id,name,gender,personality_tags,bio,hairstyle,hair_color,eye_style,eye_color,height_body_type,bust_size,outfit_accessories,additional_notes,selected_artist_name,appearance_details,created_at")
            .eq("user_id", authData.user.id)
            .eq("name", orderData.character_name)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

      const { data: characterData } = await characterQuery;
      setCharacter((characterData as CharacterRow | null) ?? null);
      setIsLoading(false);
    };

    void fetchOrder();
  }, [id, router]);

  const statusConfig = useMemo(() => {
    if (!order) {
      return null;
    }
    return statusMap[order.status] ?? statusMap.pending;
  }, [order]);

  const readAppearance = (key: string) => {
    const value = character?.appearance_details?.[key];
    return typeof value === "string" && value.trim().length > 0 ? value : "";
  };

  const displayName = character?.name || order?.character_name || "未命名角色";
  const displayGender = character?.gender || "未設定";
  const displayBodyType = character?.height_body_type || order?.body_size || readAppearance("height_body_type") || "未設定";
  const displayHairColor = character?.hair_color || order?.hair_color || readAppearance("hair_color") || "未設定";
  const displayEyeColor = character?.eye_color || order?.eye_color || readAppearance("eye_color") || "未設定";
  const displayPersonality =
    character?.personality_tags && character.personality_tags.length > 0
      ? character.personality_tags.join("、")
      : order?.personality || "未設定";
  const displayAppearanceDescription = order?.appearance_description || character?.outfit_accessories || readAppearance("outfit_accessories") || "未填寫";
  const displayOutfitStyle = character?.outfit_accessories || readAppearance("outfit_accessories") || "未填寫";
  const displayBackstory = character?.bio || "未填寫";
  const displayArtistName =
    character?.selected_artist_name || readAppearance("selected_artist_name") || "尚未指派";
  const displayNotes = order?.notes || character?.additional_notes || readAppearance("additional_notes") || "無";
  const displayCreatedAt = order?.created_at || character?.created_at || "";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/orders" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回訂單中心
        </Link>

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-[30px] border border-sky-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              載入訂單詳情中...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[30px] border border-red-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3 text-red-700">
              <ShieldAlert className="mt-0.5 h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        ) : order ? (
          <section className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-sky-100 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">訂單詳情</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{displayName}</h1>
                <p className="mt-2 text-sm text-slate-500">建立時間：{displayCreatedAt ? new Date(displayCreatedAt).toLocaleString("zh-TW") : "-"}</p>
                <p className="mt-1 text-sm text-slate-500">執筆繪師：{displayArtistName}</p>
              </div>
              {statusConfig ? (
                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              ) : null}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-sky-100 bg-sky-50/60 p-5">
                <h2 className="text-sm font-black text-slate-900">角色需求</h2>
                <div className="mt-4 space-y-4 text-sm">
                  <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">性格 / 個性</p>
                    <p className="mt-1 text-slate-700">{displayPersonality}</p>
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">外觀描述</p>
                    <p className="mt-1 whitespace-pre-wrap leading-7 text-slate-700">{displayAppearanceDescription}</p>
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">服裝風格</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{displayOutfitStyle}</p>
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">角色背景故事</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{displayBackstory}</p>
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">備註</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{displayNotes}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-sky-100 bg-white p-5">
                <h2 className="text-sm font-black text-slate-900">外觀參數</h2>
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                    <span>角色名稱</span>
                    <span className="font-semibold text-slate-900">{displayName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                    <span>性別</span>
                    <span className="font-semibold text-slate-900">{displayGender}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                    <span>體型</span>
                    <span className="font-semibold text-slate-900">{displayBodyType}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                    <span>髮色</span>
                    <span className="font-mono text-slate-900">{displayHairColor}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                    <span>眼色</span>
                    <span className="font-mono text-slate-900">{displayEyeColor}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                    <span>訂單狀態</span>
                    <span className="font-semibold text-slate-900">{statusConfig?.label ?? "待處理"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                    <span>建立時間</span>
                    <span className="font-semibold text-slate-900">{displayCreatedAt ? new Date(displayCreatedAt).toLocaleString("zh-TW") : "-"}</span>
                  </div>
                </div>

                {order.attachment_url ? (
                  <a
                    href={order.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                  >
                    <FileText className="h-4 w-4" />
                    {order.attachment_name ?? "查看附件"}
                  </a>
                ) : null}

                {character ? (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    已同步角色資料欄位
                  </div>
                ) : null}
              </article>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
