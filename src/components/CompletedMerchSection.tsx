"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Box, Download, FileArchive, Loader2, PackageOpen, X } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type MerchOrderRow = {
  id: string;
  artist_id: string | null;
  merch_type: string | null;
  delivery_file_url: string | null;
  status: string | null;
  created_at: string;
};

type FileKind = "image" | "video" | "model" | "archive" | "other";

type DeliveryItem = {
  key: string;
  orderId: string;
  url: string;
  fileName: string;
  kind: FileKind;
  kindLabel: string;
  merchType: string;
  artistName: string;
  deliveredAt: string | null;
};

const COMPLETED_STATUSES = ["completed", "delivered", "finished"];

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp"];
const VIDEO_EXTS = ["mp4", "webm", "mov"];
const MODEL_EXTS = ["glb", "vrm", "obj", "fbx"];
const ARCHIVE_EXTS = ["zip", "rar"];

function parseDeliveryUrls(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      // fall back to delimiter split below
    }

    return trimmed
      .split(/[\r\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getFileName(url: string) {
  const clean = url.split("?")[0].split("#")[0];
  const last = clean.split("/").filter(Boolean).pop() ?? "file";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function detectKind(fileName: string): { kind: FileKind; label: string } {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (IMAGE_EXTS.includes(ext)) return { kind: "image", label: "圖片" };
  if (VIDEO_EXTS.includes(ext)) return { kind: "video", label: "影片" };
  if (MODEL_EXTS.includes(ext)) return { kind: "model", label: "3D 建模" };
  if (ARCHIVE_EXTS.includes(ext)) return { kind: "archive", label: "壓縮檔" };
  return { kind: "other", label: "檔案" };
}

// Uploaded delivery files are named `${Date.now()}-${random}.${ext}` (see uploadFileToBucket),
// so the leading timestamp is the actual delivery time. Fall back to the order creation time.
function resolveDeliveredAt(fileName: string, fallbackIso: string) {
  const match = fileName.match(/^(\d{13})-/);
  if (match) {
    const date = new Date(Number(match[1]));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return fallbackIso || null;
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function isCompletedStatus(status: string | null | undefined) {
  return COMPLETED_STATUSES.includes((status ?? "").trim().toLowerCase());
}

type Props = {
  characterId: string;
};

export default function CompletedMerchSection({ characterId }: Props) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (!cancelled) {
          setErrorMessage("Supabase 尚未設定，無法讀取周邊資產。");
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("id,artist_id,merch_type,delivery_file_url,status,created_at")
        .eq("character_id", characterId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setErrorMessage(`讀取周邊資產失敗：${error.message}`);
        setLoading(false);
        return;
      }

      const completedOrders = ((data ?? []) as MerchOrderRow[]).filter(
        (order) => isCompletedStatus(order.status) && parseDeliveryUrls(order.delivery_file_url).length > 0,
      );

      const artistIds = Array.from(
        new Set(completedOrders.map((order) => order.artist_id).filter((id): id is string => Boolean(id))),
      );

      const artistNames = new Map<string, string>();
      if (artistIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,display_name,full_name")
          .in("id", artistIds);

        if (cancelled) return;

        ((profiles ?? []) as Array<{ id: string; display_name: string | null; full_name: string | null }>).forEach(
          (profile) => {
            artistNames.set(
              profile.id,
              profile.display_name?.trim() || profile.full_name?.trim() || `繪師 #${profile.id.slice(0, 6)}`,
            );
          },
        );
      }

      const nextItems: DeliveryItem[] = completedOrders.flatMap((order) =>
        parseDeliveryUrls(order.delivery_file_url).map((url, index) => {
          const fileName = getFileName(url);
          const { kind, label } = detectKind(fileName);

          return {
            key: `${order.id}-${index}`,
            orderId: order.id,
            url,
            fileName,
            kind,
            kindLabel: label,
            merchType: order.merch_type?.trim() || "周邊商品",
            artistName: order.artist_id ? artistNames.get(order.artist_id) ?? "未指定繪師" : "未指定繪師",
            deliveredAt: resolveDeliveredAt(fileName, order.created_at),
          };
        }),
      );

      setItems(nextItems);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [characterId]);

  useEffect(() => {
    if (!previewUrl) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewUrl(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewUrl]);

  return (
    <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">已完成周邊與交付資產 (Completed Merch &amp; Deliveries)</h2>
      <p className="mt-1 text-sm text-slate-500">收錄此角色委託製作並已由繪師交付的周邊成果。</p>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          載入周邊資產中...
        </div>
      ) : errorMessage ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <PackageOpen className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 text-base font-bold text-slate-900">目前尚無已完成的周邊委託</p>
          <Link
            href="/shop"
            className="mt-4 inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            立即製作周邊
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.key} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="bg-slate-50">
                {item.kind === "image" ? (
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(item.url)}
                    className="group block h-48 w-full cursor-zoom-in overflow-hidden"
                    aria-label={`查看大圖：${item.merchType}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={`${item.merchType} 交付成果`}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </button>
                ) : item.kind === "video" ? (
                  <div className="p-2">
                    <video controls preload="metadata" className="w-full rounded-xl" src={item.url} />
                  </div>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center">
                    {item.kind === "model" ? (
                      <Box className="h-12 w-12 text-slate-400" />
                    ) : (
                      <FileArchive className="h-12 w-12 text-slate-400" />
                    )}
                    <p className="w-full truncate text-sm font-semibold text-slate-700" title={item.fileName}>
                      {item.fileName}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.merchType}
                  </span>
                  {item.kind === "model" || item.kind === "archive" ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                      {item.kindLabel}
                    </span>
                  ) : null}
                </div>

                <dl className="space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between gap-3">
                    <dt>承接繪師</dt>
                    <dd className="font-semibold text-slate-800">{item.artistName}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>完成交付日期</dt>
                    <dd className="font-semibold text-slate-800">{formatDate(item.deliveredAt)}</dd>
                  </div>
                </dl>

                {item.kind === "model" || item.kind === "archive" || item.kind === "other" ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    下載檔案 / 預覽
                  </a>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    {item.kind === "image" ? "開啟原圖" : "開啟 / 下載影片"}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {previewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="關閉預覽"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="周邊交付成果大圖"
            className="max-h-full max-w-full rounded-xl border border-slate-200 object-contain shadow-lg"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
