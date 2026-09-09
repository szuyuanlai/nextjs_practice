"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

type ArtistSpotlight = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  status?: "idle" | "busy" | "closed" | null;
  role?: string | null;
};

export function ArtistMarquee() {
  const [artists, setArtists] = useState<ArtistSpotlight[]>([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);

  useEffect(() => {
    const loadArtists = async () => {
      if (!supabase) {
        setArtists([]);
        setIsLoadingArtists(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, status, role")
        .in("role", ["artist", "admin"])
        .order("full_name", { ascending: true });

      if (error) {
        console.warn("Failed to load artist profiles:", error.message);
        setArtists([]);
      } else {
        setArtists((data ?? []) as ArtistSpotlight[]);
      }

      setIsLoadingArtists(false);
    };

    void loadArtists();
  }, []);

  const marqueeArtists = artists.length > 0 ? [...artists, ...artists] : [];

  if (isLoadingArtists) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-44 min-w-[260px] animate-pulse rounded-[22px] bg-sky-50" />
        ))}
      </div>
    );
  }

  if (marqueeArtists.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-sky-200 bg-sky-50 p-8 text-center text-slate-600">
        目前尚未有可展示的聯名畫師資料。
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="animate-marquee flex min-w-max gap-4 group-hover:[animation-play-state:paused]">
        {marqueeArtists.map((artist, index) => {
          const statusLabel =
            artist.status === "idle"
              ? "🟢 可接委託"
              : artist.status === "busy"
                ? "🟡 爆滿中"
                : "🔴 暫停接單";

          return (
            <article
              key={`${artist.id}-${index}`}
              className="flex min-w-[280px] max-w-[280px] flex-col rounded-[22px] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full border border-sky-200 bg-white">
                  {artist.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artist.avatar_url} alt={artist.full_name ?? "artist avatar"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-sky-100 text-sm font-black text-sky-700">
                      {(artist.full_name ?? "A").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-black text-slate-900">{artist.full_name ?? "聯名畫師"}</h3>
                  <p className="text-xs font-semibold text-sky-700">{artist.role === "admin" ? "品牌管理者" : "聯名畫師"}</p>
                </div>
              </div>

              <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">
                {artist.bio ?? "熱愛角色設計與品牌故事共創，正在準備更多作品分享。"}
              </p>
              <div className="mb-4 text-xs font-medium text-slate-600">{statusLabel}</div>

              <Link
                href={`/artists/${artist.id}`}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                觀賞作品 <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
