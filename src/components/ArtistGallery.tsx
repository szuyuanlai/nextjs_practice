"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { PortfolioItem } from "@/src/types/artist";

export default function ArtistGallery({ items }: { items: PortfolioItem[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const close = useCallback(() => setSelectedIndex(null), []);
  const next = useCallback(
    () => setSelectedIndex((s) => (s === null ? 0 : Math.min(items.length - 1, s + 1))),
    [items.length],
  );
  const prev = useCallback(
    () => setSelectedIndex((s) => (s === null ? 0 : Math.max(0, s - 1))),
    [],
  );
  const open = useCallback((i: number) => setSelectedIndex(i), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close, next, prev]);

  if (items.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">尚未上傳任何作品</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p, i) => (
          <button key={p.id} onClick={() => open(i)} className="overflow-hidden rounded border p-0 text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src={p.image_url} alt={p.title ?? "portfolio"} className="h-40 w-full object-cover" />
          </button>
        ))}
      </div>

      {selectedIndex !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button onClick={close} className="absolute right-6 top-6 text-lg text-white">
            ✕
          </button>
          <button onClick={prev} className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl text-white">
            ◀
          </button>
          <button onClick={next} className="absolute right-16 top-1/2 -translate-y-1/2 text-2xl text-white">
            ▶
          </button>
          <div className="w-full max-w-4xl">
            <div className="flex justify-center rounded bg-black p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={items[selectedIndex].image_url}
                alt={items[selectedIndex].title ?? "preview"}
                className="h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
