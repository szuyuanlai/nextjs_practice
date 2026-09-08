"use client";

import React, { useState } from "react";
import type { PortfolioItem } from "@/src/types/artist";

export default function ArtistGallery({ items }: { items: PortfolioItem[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const open = (i: number) => setSelectedIndex(i);
  const close = () => setSelectedIndex(null);
  const next = () => setSelectedIndex((s) => (s === null ? 0 : Math.min(items.length - 1, s + 1)));
  const prev = () => setSelectedIndex((s) => (s === null ? 0 : Math.max(0, s - 1)));

  // keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items.length]);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p, i) => (
          <button key={p.id} onClick={() => open(i)} className="rounded overflow-hidden border p-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src={p.image_url} alt={p.title ?? "portfolio"} className="w-full h-40 object-cover" />
          </button>
        ))}
      </div>

      {selectedIndex !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button onClick={close} className="absolute right-6 top-6 text-white text-lg">✕</button>
          <button onClick={prev} className="absolute left-6 top-1/2 -translate-y-1/2 text-white text-2xl">◀</button>
          <button onClick={next} className="absolute right-16 top-1/2 -translate-y-1/2 text-white text-2xl">▶</button>
          <div className="max-w-4xl w-full">
            <div className="bg-black rounded p-2 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={items[selectedIndex].image_url} alt={items[selectedIndex].title ?? "preview"} className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
