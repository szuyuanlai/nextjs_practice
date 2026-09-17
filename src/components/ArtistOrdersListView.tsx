"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, Loader2, ShieldAlert, UploadCloud } from "lucide-react";
import FileUploadField from "@/src/components/FileUploadField";
import { uploadFileToBucket } from "@/src/lib/artist-data";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type CharacterOrderRow = {
  id: string;
  user_id: string;
  artist_id: string | null;
  character_name: string;
  status: string | null;
  created_at: string;
  reference_image_urls?: string[] | null;
  character_sheet_url?: string | null;
  character_icon_url?: string | null;
  is_anonymous?: boolean | null;
  personality_tags?: string[] | null;
  bio?: string | null;
  hairstyle?: string | null;
  hair_color?: string | null;
  eye_style?: string | null;
  eye_color?: string | null;
  height_body_type?: string | null;
  bust_size?: string | null;
  outfit_accessories?: string | null;
  additional_notes?: string | null;
  appearance_details?: Record<string, unknown> | null;
  client?:
    | {
        display_name: string | null;
        full_name: string | null;
      }
    | Array<{
        display_name: string | null;
        full_name: string | null;
      }>
    | null;
};

type EnrichedCharacterOrder = CharacterOrderRow & {
  clientName: string;
};

type MerchandiseOrderRow = {
  id: string;
  user_id?: string | null;
  artist_id?: string | null;
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

type ProfileRow = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

type CharacterBasic = {
  id: string;
  character_name: string;
};

type EnrichedMerchOrder = MerchandiseOrderRow & {
  clientName: string;
  clientAvatarUrl?: string | null;
  characterName: string;
};

type OrderCard =
  | {
      kind: "character";
      id: string;
      createdAt: string;
      status: string | null;
      characterOrder: EnrichedCharacterOrder;
    }
  | {
      kind: "merch";
      id: string;
      createdAt: string;
      status: string | null;
      merchOrder: EnrichedMerchOrder;
    };

type OrdersTab = "pending" | "completed";

type Toast = {
  kind: "success" | "error";
  message: string;
};

const MERCH_DELIVERY_BUCKETS = ["artist-assets", "order-uploads"] as const;
const CHARACTER_DELIVERY_BUCKETS = ["artist-assets", "order-uploads"] as const;

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function parseDeliveryUrls(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      // fallback to comma/newline split
    }

    return trimmed
      .split(/[\r\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function stripUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
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

function normalizeStatus(status: string | null) {
  const value = (status ?? "").trim().toLowerCase();

  if (value === "completed") {
    return "completed";
  }

  if (value === "in_progress" || value === "processing") {
    return "in_progress";
  }

  if (!value || ["pending", "draft", "created"].includes(value)) {
    return "pending";
  }

  return "pending";
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

function getClientName(row: CharacterOrderRow) {
  const clientProfile = Array.isArray(row.client) ? row.client[0] : row.client;
  const isAnonymous =
    row.is_anonymous === true ||
    (typeof row.appearance_details?.is_anonymous === "boolean" && row.appearance_details.is_anonymous === true);

  if (isAnonymous) {
    return "匿名委託者 (Anonymous)";
  }

  const displayName = clientProfile?.display_name?.trim();
  if (displayName) {
    return displayName;
  }

  const fullName = clientProfile?.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  return `委託人 #${row.user_id.slice(0, 6)}`;
}

function normalizeText(value: unknown, fallback = "未填寫") {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}

export default function ArtistOrdersListView() {
  const router = useRouter();
  const [characterOrders, setCharacterOrders] = useState<EnrichedCharacterOrder[]>([]);
  const [merchOrders, setMerchOrders] = useState<EnrichedMerchOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrdersTab>("pending");
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null);
  const [deliveryFilesByOrderId, setDeliveryFilesByOrderId] = useState<Record<string, File[]>>({});
  const [characterSheetFilesByOrderId, setCharacterSheetFilesByOrderId] = useState<Record<string, File[]>>({});
  const [characterIconFilesByOrderId, setCharacterIconFilesByOrderId] = useState<Record<string, File[]>>({});
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) {
        if (!cancelled) {
          setErrorMessage("Supabase 尚未設定，無法讀取繪師委託訂單。");
          setIsLoading(false);
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
        router.replace("/login?redirectTo=%2Fartist%2Forders");
        return;
      }

      console.log("Current user ID:", user?.id);

      const [charactersRes, merchRes, profilesRes, charactersBasicRes] = await Promise.all([
        supabase
          .from("characters")
          .select(
            "id,user_id,artist_id,character_name,status,created_at,reference_image_urls,character_sheet_url,character_icon_url,is_anonymous,personality_tags,bio,hairstyle,hair_color,eye_style,eye_color,height_body_type,bust_size,outfit_accessories,additional_notes,appearance_details,client:profiles!characters_user_id_fkey(display_name,full_name)",
          )
          .eq("artist_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select(`
            id,
            user_id,
            artist_id,
            character_id,
            merch_type,
            pose,
            expression,
            background_scene,
            shipping_address,
            delivery_file_url,
            status,
            created_at,
            characters:characters!orders_character_id_fkey(*)
          `)
          .eq("artist_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,display_name,full_name,avatar_url"),
        supabase.from("characters").select("id,character_name"),
      ]);

      console.log("Fetched characters error:", charactersRes.error, charactersRes.data);

      if (cancelled) {
        return;
      }

      const firstError = charactersRes.error || merchRes.error || profilesRes.error || charactersBasicRes.error;

      if (firstError) {
        setErrorMessage(`讀取委託訂單失敗：${firstError.message}`);
        setIsLoading(false);
        return;
      }

      const rows = ((charactersRes.data ?? []) as unknown) as CharacterOrderRow[];

      if (cancelled) {
        return;
      }

      const enrichedCharacters =
        rows.map((row) => ({
          ...row,
          clientName: getClientName(row),
        }));

      const profileMap = new Map<string, ProfileRow>();
      ((profilesRes.data ?? []) as ProfileRow[]).forEach((profile) => {
        profileMap.set(profile.id, profile);
      });

      const characterMap = new Map<string, CharacterBasic>();
      ((charactersBasicRes.data ?? []) as CharacterBasic[]).forEach((character) => {
        characterMap.set(character.id, character);
      });

      const enrichedMerch = ((merchRes.data ?? []) as MerchandiseOrderRow[]).map((row) => {
        const clientId = row.user_id || "";
        const client = clientId ? profileMap.get(clientId) : null;
        const displayName = client?.display_name?.trim() || client?.full_name?.trim() || `委託人 #${clientId.slice(0, 6)}`;
        const boundCharacter =
          Array.isArray(row.characters) && row.characters.length > 0
            ? row.characters[0]
            : row.character_id
              ? characterMap.get(row.character_id) ?? null
              : null;

        return {
          ...row,
          clientName: displayName,
          clientAvatarUrl: client?.avatar_url,
          characterName: boundCharacter?.character_name ?? "未綁定角色",
        };
      });

      setCharacterOrders(enrichedCharacters);
      setMerchOrders(enrichedMerch);
      setIsLoading(false);
    };

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const refreshOrders = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return;
    }

    const [charactersRes, merchRes, profilesRes, charactersBasicRes] = await Promise.all([
      supabase
        .from("characters")
        .select(
          "id,user_id,artist_id,character_name,status,created_at,reference_image_urls,character_sheet_url,character_icon_url,is_anonymous,personality_tags,bio,hairstyle,hair_color,eye_style,eye_color,height_body_type,bust_size,outfit_accessories,additional_notes,appearance_details,client:profiles!characters_user_id_fkey(display_name,full_name)",
        )
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select(`
          id,
          user_id,
          artist_id,
          character_id,
          merch_type,
          pose,
          expression,
          background_scene,
          shipping_address,
          delivery_file_url,
          status,
          created_at,
          characters:characters!orders_character_id_fkey(*)
        `)
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,display_name,full_name,avatar_url"),
      supabase.from("characters").select("id,character_name"),
    ]);

    const firstError = charactersRes.error || merchRes.error || profilesRes.error || charactersBasicRes.error;
    if (firstError) {
      setErrorMessage(`讀取委託訂單失敗：${firstError.message}`);
      return;
    }

    const rows = ((charactersRes.data ?? []) as unknown) as CharacterOrderRow[];
    const enrichedCharacters = rows.map((row) => ({
      ...row,
      clientName: getClientName(row),
    }));

    const profileMap = new Map<string, ProfileRow>();
    ((profilesRes.data ?? []) as ProfileRow[]).forEach((profile) => {
      profileMap.set(profile.id, profile);
    });

    const characterMap = new Map<string, CharacterBasic>();
    ((charactersBasicRes.data ?? []) as CharacterBasic[]).forEach((character) => {
      characterMap.set(character.id, character);
    });

    const enrichedMerch = ((merchRes.data ?? []) as MerchandiseOrderRow[]).map((row) => {
      const clientId = row.user_id || "";
      const client = clientId ? profileMap.get(clientId) : null;
      const displayName = client?.display_name?.trim() || client?.full_name?.trim() || `委託人 #${clientId.slice(0, 6)}`;
      const boundCharacter =
        Array.isArray(row.characters) && row.characters.length > 0
          ? row.characters[0]
          : row.character_id
            ? characterMap.get(row.character_id) ?? null
            : null;

      return {
        ...row,
        clientName: displayName,
        clientAvatarUrl: client?.avatar_url,
        characterName: boundCharacter?.character_name ?? "未綁定角色",
      };
    });

    setCharacterOrders(enrichedCharacters);
    setMerchOrders(enrichedMerch);
  };

  const cards = useMemo<OrderCard[]>(() => {
    const characterCards: OrderCard[] = characterOrders.map((item) => ({
      kind: "character",
      id: item.id,
      status: item.status,
      createdAt: item.created_at,
      characterOrder: item,
    }));

    const merchCards: OrderCard[] = merchOrders.map((item) => ({
      kind: "merch",
      id: item.id,
      status: item.status ?? null,
      createdAt: item.created_at,
      merchOrder: item,
    }));

    return [...characterCards, ...merchCards].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [characterOrders, merchOrders]);

  const completedCount = useMemo(
    () => cards.filter((order) => normalizeStatus(order.status) === "completed").length,
    [cards],
  );

  const pendingCount = useMemo(
    () => cards.filter((order) => normalizeStatus(order.status) !== "completed").length,
    [cards],
  );

  const filteredOrders = useMemo(
    () =>
      cards.filter((order) => {
        const normalized = normalizeStatus(order.status);
        return activeTab === "completed" ? normalized === "completed" : normalized !== "completed";
      }),
    [activeTab, cards],
  );

  const setFilesForOrder = (orderId: string, files: File[]) => {
    setDeliveryFilesByOrderId((current) => ({
      ...current,
      [orderId]: files,
    }));
  };

  const setCharacterSheetFilesForOrder = (orderId: string, files: File[]) => {
    setCharacterSheetFilesByOrderId((current) => ({
      ...current,
      [orderId]: files.slice(0, 1),
    }));
  };

  const setCharacterIconFilesForOrder = (orderId: string, files: File[]) => {
    setCharacterIconFilesByOrderId((current) => ({
      ...current,
      [orderId]: files.slice(0, 1),
    }));
  };

  const handleUploadCharacterDelivery = async (order: EnrichedCharacterOrder) => {
    const characterId = order.id;
    const sheetFile = (characterSheetFilesByOrderId[order.id] ?? [])[0] ?? null;
    const iconFile = (characterIconFilesByOrderId[order.id] ?? [])[0] ?? null;

    if (!sheetFile || !iconFile) {
      setToast({ kind: "error", message: "請先完成角色三視圖與角色頭像兩個檔案選擇。" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setToast({ kind: "error", message: "Supabase 尚未設定。" });
      return;
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setToast({ kind: "error", message: "登入已過期，請重新登入。" });
      router.replace("/login?redirectTo=%2Fartist%2Forders");
      return;
    }

    setUploadingOrderId(order.id);

    try {
      console.log("[ArtistOrders] start character delivery", { characterId, artistId: user.id });

      const sheetPath = `${user.id}/${characterId}/character-sheet-${Date.now()}-${sheetFile.name}`;
      const iconPath = `${user.id}/${characterId}/character-icon-${Date.now()}-${iconFile.name}`;

      const characterSheetUpload = await uploadFileToBucket(
        supabase,
        CHARACTER_DELIVERY_BUCKETS,
        sheetFile,
        sheetPath,
      );
      const characterIconUpload = await uploadFileToBucket(
        supabase,
        CHARACTER_DELIVERY_BUCKETS,
        iconFile,
        iconPath,
      );
      const characterSheetUrl = characterSheetUpload.publicUrl;
      const characterIconUrl = characterIconUpload.publicUrl;

      console.log("[ArtistOrders] upload success", {
        characterId,
        characterSheetUpload,
        characterIconUpload,
        characterSheetUrl,
        characterIconUrl,
      });

      const existingImageUrls = parseStringArray(order.reference_image_urls ?? []);
      const existingDeliveryUrls = parseStringArray(order.appearance_details?.delivery_asset_urls);
      const nextDeliveryUrls = uniqueStrings([...existingDeliveryUrls, characterSheetUrl, characterIconUrl]);
      const nextImageUrls = uniqueStrings([...existingImageUrls, characterSheetUrl, characterIconUrl]);
      const nextAppearance = {
        ...(order.appearance_details ?? {}),
        delivery_asset_urls: nextDeliveryUrls,
        delivered_at: new Date().toISOString(),
        completed_by_artist_id: user.id,
      };

      const characterUpdatePayload = stripUndefined({
        status: "completed",
        character_icon_url: characterIconUrl,
        character_sheet_url: characterSheetUrl,
        reference_image_urls: nextImageUrls,
        appearance_details: nextAppearance,
      });

      console.log("[ArtistOrders] characters update payload", {
        characterId,
        payload: characterUpdatePayload,
      });

      const { data: characterUpdateRows, error: characterUpdateError } = await supabase
        .from("characters")
        .update(characterUpdatePayload)
        .eq("id", characterId)
        .eq("artist_id", user.id)
        .select("id,status,character_sheet_url,character_icon_url");

      if (characterUpdateError) {
        console.error("Characters 更新失敗：", characterUpdateError);
        alert(`交付失敗：${characterUpdateError.message}`);
        throw characterUpdateError;
      }

      console.log("[ArtistOrders] characters update success", {
        characterId,
        rows: characterUpdateRows,
      });

      setCharacterSheetFilesByOrderId((current) => ({
        ...current,
        [order.id]: [],
      }));
      setCharacterIconFilesByOrderId((current) => ({
        ...current,
        [order.id]: [],
      }));
      setToast({ kind: "success", message: "角色交付成功，狀態已更新為已完成。" });
      alert("交付成功！");
      await refreshOrders();
      router.refresh();
    } catch (error) {
      console.error("Delivery update failed:", error);
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "角色交付失敗，請稍後再試。",
      });
      window.alert("交付更新失敗，請稍後再試或檢查 Supabase 權限設定。");
    } finally {
      setUploadingOrderId(null);
    }
  };

  const handleUploadMerchDelivery = async (order: EnrichedMerchOrder) => {
    const files = deliveryFilesByOrderId[order.id] ?? [];
    if (!files.length) {
      setToast({ kind: "error", message: "請先選擇需要交付的圖片或檔案。" });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setToast({ kind: "error", message: "Supabase 尚未設定。" });
      return;
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setToast({ kind: "error", message: "登入已過期，請重新登入。" });
      router.replace("/login?redirectTo=%2Fartist%2Forders");
      return;
    }

    setUploadingOrderId(order.id);

    try {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const path = `${user.id}/${order.id}/delivery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
          const uploadResult = await uploadFileToBucket(supabase, MERCH_DELIVERY_BUCKETS, file, path);
          return uploadResult.publicUrl;
        }),
      );

      const existingUrls = Array.isArray(order.delivery_file_url)
        ? order.delivery_file_url
        : typeof order.delivery_file_url === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(order.delivery_file_url);
                return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
              } catch {
                return order.delivery_file_url
                  .split(/[\r\n,]+/)
                  .map((item) => item.trim())
                  .filter(Boolean);
              }
            })()
          : [];

      const combinedUrls = Array.from(new Set([...existingUrls, ...uploadedUrls]));
      const serializedDeliveryUrl = combinedUrls.length > 1 ? JSON.stringify(combinedUrls) : combinedUrls[0] ?? null;

      const updatePayload = stripUndefined({
        delivery_file_url: serializedDeliveryUrl,
        status: "completed",
      });
      const { data, error } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id)
        .eq("artist_id", user.id)
        .select("id,status,delivery_file_url");

      if (error) {
        throw error;
      }

      console.log("[ArtistOrders] merch update success", {
        orderId: order.id,
        payload: updatePayload,
        rows: data,
      });

      setToast({ kind: "success", message: "交付成功！訂單已更新為已完成。" });
      setDeliveryFilesByOrderId((current) => ({
        ...current,
        [order.id]: [],
      }));
      await refreshOrders();
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "交付上傳失敗，請稍後再試。",
      });
    } finally {
      setUploadingOrderId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {toast ? (
          <div className="pointer-events-none fixed right-5 top-5 z-50">
            <div
              className={[
                "rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur-sm",
                toast.kind === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700",
              ].join(" ")}
            >
              {toast.message}
            </div>
          </div>
        ) : null}

        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <section className="mb-8 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            <ClipboardList className="h-3.5 w-3.5" />
            Artist Orders
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">客戶委託訂單</h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                直接平鋪顯示角色委託與周邊委託完整資訊，並可在此上傳周邊交付檔案。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">總委託</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{cards.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">已完成</p>
                <p className="mt-1 text-2xl font-black text-emerald-700">{completedCount}</p>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <ShieldAlert className="mt-0.5 h-5 w-5" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <section className="mb-6 rounded-2xl border border-sky-100 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={[
                "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                activeTab === "pending"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              待處理訂單 ({pendingCount})
            </button>
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
              已完成訂單 ({completedCount})
            </button>
          </div>
        </section>

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-[30px] border border-sky-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              載入委託訂單中...
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-sky-200 bg-white p-12 text-center shadow-sm">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-sky-500" />
            {activeTab === "pending" ? (
              <>
                <p className="text-xl font-black text-slate-900">目前沒有待處理訂單</p>
                <p className="mt-2 text-slate-600">新的待接單與進行中委託會顯示在這裡。</p>
              </>
            ) : (
              <>
                <p className="text-xl font-black text-slate-900">目前沒有已完成訂單</p>
                <p className="mt-2 text-slate-600">完成交付後的委託會顯示在這裡。</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);

              return (
                <article key={`${order.kind}-${order.id}`} className="rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3 border-b border-sky-100 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">訂單編號</p>
                      <p className="mt-2 text-lg font-black text-slate-900">#{order.id.slice(0, 8)}</p>
                      <p className={[
                        "mt-2 inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white",
                        order.kind === "character"
                          ? "bg-indigo-500"
                          : "bg-amber-500",
                      ].join(" ")}>
                        {order.kind === "character" ? "角色創建" : "周邊製作"}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {order.kind === "character" ? (
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                      <div className="space-y-3 text-sm text-slate-700">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">客戶名稱</p>
                          <p className="mt-1 font-semibold text-slate-900">{order.characterOrder.clientName}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">角色名稱</p>
                          <p className="mt-1 font-semibold text-slate-900">{order.characterOrder.character_name}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">角色完整 DNA / 外觀特徵</p>
                          <dl className="mt-2 grid gap-1">
                            <div>髮型：{normalizeText(order.characterOrder.hairstyle || order.characterOrder.appearance_details?.hairstyle)}</div>
                            <div>髮色：{normalizeText(order.characterOrder.hair_color || order.characterOrder.appearance_details?.hair_color)}</div>
                            <div>眼睛風格：{normalizeText(order.characterOrder.eye_style || order.characterOrder.appearance_details?.eye_style)}</div>
                            <div>眼色：{normalizeText(order.characterOrder.eye_color || order.characterOrder.appearance_details?.eye_color)}</div>
                            <div>服裝風格：{normalizeText(order.characterOrder.outfit_accessories || order.characterOrder.appearance_details?.outfit_accessories)}</div>
                            <div>身高體型：{normalizeText(order.characterOrder.height_body_type || order.characterOrder.appearance_details?.height_body_type)}</div>
                            <div>歐派大小：{normalizeText(order.characterOrder.bust_size || order.characterOrder.appearance_details?.bust_size)}</div>
                            <div>個性：{(order.characterOrder.personality_tags ?? []).join("、") || normalizeText(order.characterOrder.appearance_details?.personality_text)}</div>
                            <div>背景故事：{normalizeText(order.characterOrder.bio || order.characterOrder.appearance_details?.background_story)}</div>
                            <div>額外需求：{normalizeText(order.characterOrder.additional_notes || order.characterOrder.appearance_details?.additional_notes)}</div>
                          </dl>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm text-slate-700">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">下單時間</p>
                        <p className="mt-2 font-semibold text-slate-900">{formatDateTime(order.characterOrder.created_at)}</p>
                        {normalizeStatus(order.characterOrder.status) === "completed" ? (
                          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            此角色委託已完成
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-amber-700">
                              <UploadCloud className="h-4 w-4" />
                              角色交付上傳
                            </div>

                            <div className="mb-3 rounded-xl border border-emerald-200 bg-white p-3">
                              <p className="mb-2 text-xs font-semibold text-slate-700">角色三視圖 (character_sheet_url)</p>
                              <FileUploadField
                                id={`artist-character-sheet-delivery-${order.characterOrder.id}`}
                                accept="image/*"
                                files={characterSheetFilesByOrderId[order.characterOrder.id] ?? []}
                                onFilesChange={(files) => setCharacterSheetFilesForOrder(order.characterOrder.id, files)}
                                buttonText="上傳角色三視圖"
                                emptyText="尚未選擇角色三視圖"
                                className="text-slate-700"
                              />
                            </div>

                            <div className="mb-3 rounded-xl border border-emerald-200 bg-white p-3">
                              <p className="mb-2 text-xs font-semibold text-slate-700">角色頭像 (character_icon_url)</p>
                              <FileUploadField
                                id={`artist-character-icon-delivery-${order.characterOrder.id}`}
                                accept="image/*"
                                files={characterIconFilesByOrderId[order.characterOrder.id] ?? []}
                                onFilesChange={(files) => setCharacterIconFilesForOrder(order.characterOrder.id, files)}
                                buttonText="上傳角色頭像"
                                emptyText="尚未選擇角色頭像"
                                className="text-slate-700"
                              />
                            </div>

                            {!(characterSheetFilesByOrderId[order.characterOrder.id]?.[0] && characterIconFilesByOrderId[order.characterOrder.id]?.[0]) ? (
                              <p className="mb-2 text-[11px] font-semibold text-amber-700">
                                請先完成兩個檔案上傳：角色三視圖 + 角色頭像，才可確認交付。
                              </p>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => void handleUploadCharacterDelivery(order.characterOrder)}
                              disabled={
                                uploadingOrderId === order.characterOrder.id ||
                                !(characterSheetFilesByOrderId[order.characterOrder.id]?.[0] && characterIconFilesByOrderId[order.characterOrder.id]?.[0])
                              }
                              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:bg-none"
                            >
                              {uploadingOrderId === order.characterOrder.id ? "交付上傳中..." : "確認交付"}
                            </button>
                          </div>
                        )}

                        {order.characterOrder.character_icon_url ? (
                          <a
                            href={order.characterOrder.character_icon_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700"
                          >
                            查看角色 Icon
                          </a>
                        ) : null}
                        {order.characterOrder.character_sheet_url ? (
                          <a
                            href={order.characterOrder.character_sheet_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700"
                          >
                            查看角色三視圖
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                      <div className="space-y-3 text-sm text-slate-700">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">客戶名稱</p>
                          <p className="mt-1 font-semibold text-slate-900">{order.merchOrder.clientName}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">周邊類型 (merch_type)</p>
                          <p className="mt-1 font-semibold text-slate-900">{normalizeText(order.merchOrder.merch_type)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">綁定角色</p>
                          <p className="mt-1 text-slate-800">{order.merchOrder.characterName}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">需求詳情</p>
                          <dl className="mt-2 grid gap-1">
                            <div>姿勢描述：{normalizeText(order.merchOrder.pose)}</div>
                            <div>表情描述：{normalizeText(order.merchOrder.expression)}</div>
                            <div>場景背景：{normalizeText(order.merchOrder.background_scene)}</div>
                          </dl>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm text-slate-700">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">寄送地址 (shipping_address)</p>
                          <dl className="mt-2 grid gap-1">
                            <div>收件人：{normalizeText(order.merchOrder.shipping_address?.name)}</div>
                            <div>電話：{normalizeText(order.merchOrder.shipping_address?.phone)}</div>
                            <div>地址：{normalizeText(order.merchOrder.shipping_address?.address)}</div>
                          </dl>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">下單時間</p>
                          <p className="mt-1 font-semibold text-slate-900">{formatDateTime(order.merchOrder.created_at)}</p>
                        </div>

                        {(order.merchOrder.status ?? "").toLowerCase() === "completed" ? (() => {
                          const deliveryUrls = parseDeliveryUrls(order.merchOrder.delivery_file_url);

                          if (!deliveryUrls.length) return null;

                          return (
                            <div className="space-y-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">已交付圖片</p>
                              <div className="grid grid-cols-2 gap-3">
                                {deliveryUrls.slice(0, 4).map((url: string, index: number) => (
                                  <a key={`${order.merchOrder.id}-${index}`} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-sky-200 bg-white">
                                    <img src={url} alt={`交付成果 ${index + 1}`} className="h-24 w-full object-cover" />
                                  </a>
                                ))}
                              </div>
                              <a
                                href={deliveryUrls[0]}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700"
                              >
                                下載 / 預覽交付檔案
                              </a>
                            </div>
                          );
                        })() : (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-700">
                              <UploadCloud className="h-4 w-4" />
                              上傳交付成品
                            </div>
                            <FileUploadField
                              id={`artist-merch-delivery-${order.merchOrder.id}`}
                              accept="image/*,.zip,.psd,.blend,.fbx,.obj,.mp4,.mov,.rar"
                              files={deliveryFilesByOrderId[order.merchOrder.id] ?? []}
                              onFilesChange={(files) => setFilesForOrder(order.merchOrder.id, files)}
                              buttonText="選擇交付檔案"
                              emptyText="尚未選擇任何檔案"
                              className="text-slate-700"
                              multiple={true}
                            />
                            <button
                              type="button"
                              onClick={() => void handleUploadMerchDelivery(order.merchOrder)}
                              disabled={uploadingOrderId === order.merchOrder.id}
                              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              {uploadingOrderId === order.merchOrder.id ? "上傳中..." : "上傳並標記為已完成"}
                            </button>
                          </div>
                        )}
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
