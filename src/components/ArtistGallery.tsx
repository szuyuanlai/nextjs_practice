"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { PortfolioItem } from "@/src/types/artist";

export default function ArtistGallery({ items }: { items: PortfolioItem[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const publicItems = useMemo(
    () => items.filter((item) => !(item.is_internal ?? item.is_internal_work)),
    [items],
  );

  const close = useCallback(() => {
    setSelectedIndex(null);
    setZoom(1);
  }, []);

  const next = useCallback(
    () => setSelectedIndex((s) => (s === null ? 0 : Math.min(publicItems.length - 1, s + 1))),
    [publicItems.length],
  );

  const prev = useCallback(
    () => setSelectedIndex((s) => (s === null ? 0 : Math.max(0, s - 1))),
    [],
  );

  const open = useCallback((i: number) => {
    setSelectedIndex(i);
    setZoom(1);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close, next, prev]);

  useEffect(() => {
    if (selectedIndex === null) return;
    setZoom(1);
  }, [selectedIndex]);

  if (publicItems.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">尚未公開任何作品</div>;
  }

  const currentItem = selectedIndex !== null ? publicItems[selectedIndex] : null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {publicItems.map((p, i) => (
          <button key={p.id} onClick={() => open(i)} className="overflow-hidden rounded border border-slate-200 bg-white p-0 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={p.image_url} alt={p.title ?? "portfolio"} className="h-40 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1 text-[10px] font-medium text-white">
                {p.title ?? "作品檢視"}
              </div>
            </div>
          </button>
        ))}
      </div>

      {currentItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6">
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl">
            <button onClick={close} className="absolute right-4 top-4 z-20 rounded-full bg-black/40 px-3 py-2 text-lg text-white backdrop-blur-sm transition hover:bg-black/60">
              ✕
            </button>

            <div className="grid lg:grid-cols-[1.4fr_0.6fr]">
              <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-[#0b1020]">
                <button onClick={prev} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-2xl text-white backdrop-blur-sm transition hover:bg-black/60">
                  ◀
                </button>

                <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-6">
                  <div
                    className="transition-transform duration-200 ease-out"
                    style={{ transform: `scale(${zoom})` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentItem.image_url}
                      alt={currentItem.title ?? "preview"}
                      className="max-h-[70vh] w-auto max-w-full object-contain shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                    />
                  </div>
                </div>

                <button onClick={next} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-2xl text-white backdrop-blur-sm transition hover:bg-black/60">
                  ▶
                </button>

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-8 text-white">
                  <div className="text-sm font-medium">
                    {selectedIndex! + 1} / {publicItems.length}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition hover:bg-white/15"
                    >
                      −
                    </button>
                    <span className="min-w-12 text-center text-sm font-semibold">{zoom.toFixed(2)}x</span>
                    <button
                      type="button"
                      onClick={() => setZoom((value) => Math.min(2.5, Number((value + 0.25).toFixed(2))))}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition hover:bg-white/15"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <aside className="border-t border-white/10 bg-white/5 p-5 text-white backdrop-blur-sm lg:border-l lg:border-t-0">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-sky-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">
                    Public Work
                  </span>
                  <a
                    href={currentItem.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    下載
                  </a>
                </div>

                <h3 className="text-2xl font-black text-white">{currentItem.title ?? "作品名稱"}</h3>

                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">作品狀態</p>
                    <p className="mt-2 font-semibold text-white">公開展示</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">尺寸</p>
                    <p className="mt-2 font-semibold text-white">可下載原圖</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">說明</p>
                    <p className="mt-2 leading-6 text-slate-200">
                      {currentItem.title ? `這是 ${currentItem.title} 的公開作品檢視。` : "這是繪師的公開作品檢視內容。"}
                    </p>
                  </div>
                </div>

                <div className="mt-5"> 
                  <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                    <span>圖片數量</span>
                    <span className="font-semibold text-white">{publicItems.length}</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
