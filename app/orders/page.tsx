"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, Loader2, ShieldAlert } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type CharacterOrderRow = {
  id: string;
  user_id: string;
  character_name: string;
  character_gender?: string | null;
  status: string | null;
  personality_tags?: string[] | null;
  bio?: string | null;
  hairstyle?: string | null;
  hair_color?: string | null;
  eye_style?: string | null;
  eye_color?: string | null;
  height_body_type?: string | null;
  bust_size?: string | null;
  theme_color?: string | null;
  outfit_accessories?: string | null;
  additional_notes?: string | null;
  selected_artist_name?: string | null;
  reference_image_urls?: string[] | null;
  is_anonymous?: boolean | null;
  created_at: string;
};

type MerchandiseOrderRow = {
  id: string;
  user_id?: string | null;
  character_id?: string | null;
  merch_type?: string | null;
  pose?: string | null;
  expression?: string | null;
  background_scene?: string | null;
  shipping_address?: Record<string, unknown> | null;
  delivery_file_url?: string | null;
  status?: string | null;
  created_at: string;
  characters?: CharacterOrderRow[] | null;
};

type ArtistProfile = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type CharacterOption = {
  id: string;
  character_name: string;
};

type UnifiedOrderCard =
  | {
      orderKind: "character";
      id: string;
      createdAt: string;
      status: string | null;
      artist: ArtistProfile | null;
      character: CharacterOrderRow;
    }
  | {
      orderKind: "merch";
      id: string;
      createdAt: string;
      status: string | null;
      artist: ArtistProfile | null;
      character: CharacterOption | null;
      merchOrder: MerchandiseOrderRow;
    };

function statusToLabel(status: string | null | undefined) {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "completed") {
    return { label: "已完成", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }
  if (normalized === "in_progress") {
    return { label: "進行中", color: "bg-sky-100 text-sky-700 border-sky-200" };
  }
  if (normalized === "approved") {
    return { label: "已批准", color: "bg-sky-100 text-sky-700 border-sky-200" };
  }
  if (normalized === "rejected") {
    return { label: "已拒絕", color: "bg-rose-100 text-rose-700 border-rose-200" };
  }
  return { label: "待處理", color: "bg-amber-100 text-amber-700 border-amber-200" };
}

function normalizeText(value: unknown, fallback = "未填寫") {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("zh-TW");
}

function artistName(artist: ArtistProfile | null) {
  if (!artist) return "尚未指派";
  return artist.display_name?.trim() || artist.full_name?.trim() || `繪師 #${artist.id.slice(0, 6)}`;
}

export default function OrdersPage() {
  const router = useRouter();
  const [cards, setCards] = useState<UnifiedOrderCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        if (!cancelled) {
          setError("Supabase 尚未設定，請先加入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
          setIsLoading(false);
        }
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.replace("/login?redirectTo=%2Forders");
        return;
      }

      const userId = authData.user.id;

      const [characterRes, merchByUserRes, merchByClientRes, artistRes, characterBasicRes] = await Promise.all([
        supabase
          .from("characters")
          .select("id,user_id,character_name,character_gender,status,personality_tags,bio,hairstyle,hair_color,eye_style,eye_color,height_body_type,bust_size,theme_color,outfit_accessories,additional_notes,selected_artist_name,reference_image_urls,is_anonymous,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select(`
            id,
            user_id,
            character_id,
            merch_type,
            pose,
            expression,
            background_scene,
            shipping_address,
            delivery_file_url,
            status,
            created_at,
            characters:character_id (
              id,
              character_name,
              character_gender,
              personality_tags,
              bio,
              hairstyle,
              hair_color,
              eye_style,
              eye_color,
              height_body_type,
              bust_size,
              theme_color,
              outfit_accessories,
              additional_notes,
              selected_artist_name,
              reference_image_urls,
              is_anonymous,
              status,
              created_at
            )
          `)
          .eq("user_id", userId)
          .not("merch_type", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select(`
            id,
            user_id,
            character_id,
            merch_type,
            pose,
            expression,
            background_scene,
            shipping_address,
            delivery_file_url,
            status,
            created_at,
            characters:character_id (
              id,
              character_name,
              character_gender,
              personality_tags,
              bio,
              hairstyle,
              hair_color,
              eye_style,
              eye_color,
              height_body_type,
              bust_size,
              theme_color,
              outfit_accessories,
              additional_notes,
              selected_artist_name,
              reference_image_urls,
              is_anonymous,
              status,
              created_at
            )
          `)
          .eq("user_id", userId)
          .not("merch_type", "is", null)
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,full_name,display_name,avatar_url"),
        supabase.from("characters").select("id,character_name").eq("user_id", userId),
      ]);

      if (cancelled) return;

      const firstError =
        characterRes.error || merchByUserRes.error || merchByClientRes.error || artistRes.error || characterBasicRes.error;

      if (firstError) {
        setError(firstError.message);
        setIsLoading(false);
        return;
      }

      const artistMap = new Map<string, ArtistProfile>();
      ((artistRes.data ?? []) as ArtistProfile[]).forEach((artist) => {
        artistMap.set(artist.id, artist);
      });

      const characterBasicMap = new Map<string, CharacterOption>();
      ((characterBasicRes.data ?? []) as CharacterOption[]).forEach((item) => {
        characterBasicMap.set(item.id, item);
      });

      const characterCards: UnifiedOrderCard[] = ((characterRes.data ?? []) as CharacterOrderRow[]).map((character) => ({
        orderKind: "character",
        id: character.id,
        createdAt: character.created_at,
        status: character.status,
        artist: null,
        character,
      }));

      const merchRows = [
        ...((merchByUserRes.data ?? []) as MerchandiseOrderRow[]),
        ...((merchByClientRes.data ?? []) as MerchandiseOrderRow[]),
      ];
      const uniqueMerchRows = Array.from(new Map(merchRows.map((item) => [item.id, item])).values());

      const merchCards: UnifiedOrderCard[] = uniqueMerchRows.map((merchOrder) => ({
        orderKind: "merch",
        id: merchOrder.id,
        createdAt: merchOrder.created_at,
        status: merchOrder.status ?? null,
        artist: null,
        character:
          merchOrder.characters && merchOrder.characters.length > 0
            ? merchOrder.characters[0]
            : merchOrder.character_id
              ? characterBasicMap.get(merchOrder.character_id) ?? null
              : null,
        merchOrder,
      }));

      setCards(
        [...characterCards, ...merchCards].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
      setIsLoading(false);
    };

    void fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const totalOrders = cards.length;
  const completedOrders = useMemo(
    () => cards.filter((card) => (card.status ?? "").toLowerCase() === "completed").length,
    [cards],
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
              <ArrowLeft className="h-4 w-4" />
              返回首頁
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">訂單中心</h1>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">總訂單</p>
            <p className="text-2xl font-black text-slate-900">{totalOrders}</p>
            <p className="mt-1 text-xs text-emerald-700">已完成 {completedOrders}</p>
          </div>
        </div>

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <ShieldAlert className="mt-0.5 h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-[30px] border border-sky-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              載入訂單中...
            </div>
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-sky-200 bg-white p-12 text-center shadow-sm">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-sky-500" />
            <p className="text-xl font-black text-slate-900">目前沒有訂單紀錄</p>
            <p className="mt-2 text-slate-600">提交新的角色需求後，這裡會立即顯示進度。</p>
          </div>
        ) : (
          <div className="space-y-5">
            {cards.map((card) => {
              const statusConfig = statusToLabel(card.status);

              return (
                <article key={`${card.orderKind}-${card.id}`} className="rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-sky-100 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">訂單編號</p>
                      <h2 className="mt-2 text-xl font-black text-slate-900">#{card.id.slice(0, 8)}</h2>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                        {card.orderKind === "character" ? "角色委託" : "周邊委託"}
                      </p>
                    </div>

                    <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {card.orderKind === "character" ? (
                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">角色名稱</p>
                          <p className="mt-2 font-semibold text-slate-800">{card.character.character_name}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">角色完整 DNA / 外觀特徵</p>
                          <dl className="mt-2 grid gap-2 text-sm text-slate-700">
                            <div>髮型：{normalizeText(card.character.hairstyle)}</div>
                            <div>髮色：{normalizeText(card.character.hair_color)}</div>
                            <div>眼睛風格：{normalizeText(card.character.eye_style)}</div>
                            <div>眼色：{normalizeText(card.character.eye_color)}</div>
                            <div>服裝風格：{normalizeText(card.character.outfit_accessories)}</div>
                            <div>身高體型：{normalizeText(card.character.height_body_type)}</div>
                            <div>個性：{(card.character.personality_tags ?? []).join("、") || "未設定"}</div>
                            <div>個性背景：{normalizeText(card.character.bio)}</div>
                            <div>額外需求：{normalizeText(card.character.additional_notes)}</div>
                          </dl>
                        </div>
                      </div>

                      <div className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">繪師資訊</p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-full border border-sky-200 bg-white">
                              {card.artist?.avatar_url ? (
                                <img src={card.artist.avatar_url} alt={artistName(card.artist)} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-black text-sky-700">
                                  {artistName(card.artist).charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-slate-800">{artistName(card.artist)}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">建立時間</p>
                          <p className="mt-2 font-semibold text-slate-800">{formatDateTime(card.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">周邊類型</p>
                          <p className="mt-2 font-semibold text-slate-800">{normalizeText(card.merchOrder.merch_type)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">綁定角色資訊</p>
                          <p className="mt-2 text-slate-700">{card.character?.character_name ?? "未綁定角色"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">客戶需求詳情</p>
                          <div className="mt-2 space-y-1 text-sm text-slate-700">
                            <div>姿勢描述：{normalizeText(card.merchOrder.pose)}</div>
                            <div>表情描述：{normalizeText(card.merchOrder.expression)}</div>
                            <div>場景背景：{normalizeText(card.merchOrder.background_scene)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">繪師資訊</p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-full border border-sky-200 bg-white">
                              {card.artist?.avatar_url ? (
                                <img src={card.artist.avatar_url} alt={artistName(card.artist)} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-black text-sky-700">
                                  {artistName(card.artist).charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-slate-800">{artistName(card.artist)}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">寄送地址</p>
                          <p className="mt-2 text-sm text-slate-700">
                            {card.merchOrder.shipping_address ? JSON.stringify(card.merchOrder.shipping_address) : "未填寫地址"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">建立時間</p>
                          <p className="mt-2 font-semibold text-slate-800">{formatDateTime(card.createdAt)}</p>
                        </div>
                        {(card.status ?? "").toLowerCase() === "completed" && card.merchOrder.delivery_file_url ? (
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">成品交付檔案</p>
                            <a
                              href={card.merchOrder.delivery_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex rounded-full border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-700"
                            >
                              下載 / 預覽交付檔案
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
