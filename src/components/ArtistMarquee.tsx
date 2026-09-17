"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

type ArtistSpotlight = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  bio?: string | null;
  status?: "idle" | "busy" | "closed" | string | null;
  role?: string | null;
};

const normalizeArtistStatus = (status?: string | null) => {
  const value = (status ?? "").toLowerCase();

  if (["idle", "available", "open", "free"].includes(value)) return "idle";
  if (["busy", "full", "booked", "occupied"].includes(value)) return "busy";
  if (["closed", "paused", "unavailable"].includes(value)) return "closed";

  return "idle";
};

function buildExpandedArtists(artists: ArtistSpotlight[], minCount = 12) {
  if (artists.length === 0) {
    return [] as ArtistSpotlight[];
  }

  if (artists.length >= minCount) {
    return artists;
  }

  const expanded: ArtistSpotlight[] = [];
  while (expanded.length < minCount) {
    for (const artist of artists) {
      expanded.push(artist);
      if (expanded.length >= minCount) {
        break;
      }
    }
  }

  return expanded;
}

export function ArtistMarquee() {
  const [artists, setArtists] = useState<ArtistSpotlight[]>([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) {
        setArtists([]);
        setIsLoadingArtists(false);
        return;
      }

      try {
        setIsLoadingArtists(true);

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "ARTIST");

        console.log("Fetching artists...", { data, error });

        if (error) {
          console.error("Failed to load artist profiles:", error.message, error.details);
          setArtists([]);
          return;
        }

        console.log("Successfully fetched artists:", data);
        setArtists((data ?? []) as ArtistSpotlight[]);
      } catch (error) {
        console.error("Failed to load artist profiles:", error);
        setArtists([]);
      } finally {
        setIsLoadingArtists(false);
      }
    };

    void fetchData();
  }, []);

  const expandedArtists = useMemo(() => buildExpandedArtists(artists, 12), [artists]);

  if (isLoadingArtists) {
    return (
        <div className="flex gap-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-44 min-w-[260px] animate-pulse rounded-[22px] bg-sky-50" />
        ))}
      </div>
    );
  }

  if (expandedArtists.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-sky-200 bg-sky-50 p-8 text-center text-slate-600">
        目前尚未有可展示的聯名畫師資料。
      </div>
    );
  }

  const renderTrack = (trackKey: string) => (
    <div key={trackKey} className="flex min-w-max shrink-0 gap-4">
      {expandedArtists.map((artist, index) => {
        const artistName = artist.display_name ?? artist.full_name ?? "聯名畫師";
        const normalizedStatus = normalizeArtistStatus(artist.status);
        const statusConfig =
          normalizedStatus === "idle"
            ? { label: "可接委託", className: "bg-emerald-500 text-white" }
            : normalizedStatus === "busy"
              ? { label: "需排單", className: "bg-amber-500 text-white" }
              : { label: "暫停接單", className: "bg-rose-500 text-white" };
        const coverUrl = artist.cover_url?.trim() || "";

        return (
          <article
            key={`${trackKey}-${artist.id}-${index}`}
            className="relative flex min-w-[280px] max-w-[280px] flex-col overflow-hidden rounded-[22px] border border-sky-100 bg-white shadow-sm"
          >
            <div className="relative aspect-video overflow-hidden bg-[linear-gradient(120deg,#dbeafe_0%,#e0f2fe_45%,#f0f9ff_100%)]">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt={`${artistName} cover`} className="h-full w-full object-cover" />
              ) : null}
              <span
                className={[
                  "absolute right-3 top-3 z-10 inline-flex rounded-md px-2.5 py-1 text-xs font-bold shadow-sm",
                  statusConfig.className,
                ].join(" ")}
              >
                {statusConfig.label}
              </span>
            </div>

            <div className="flex flex-1 flex-col px-4 pb-4">
              <div className="relative z-10 -mb-1 -mt-10 ml-4 flex items-end gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-white shadow-sm ring-4 ring-white">
                  {artist.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artist.avatar_url} alt={artistName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-sky-100 text-sm font-black text-sky-700">
                      {(artistName ?? "A").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 pb-0.5">
                  <h3 className="truncate text-lg font-black text-slate-900">{artistName}</h3>
                  <p className="text-xs font-semibold text-sky-700">聯名畫師</p>
                </div>
              </div>

              <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">
                {artist.bio ?? "熱愛角色設計與品牌故事共創，正在準備更多作品分享。"}
              </p>

              <Link
                href={`/artists/${artist.id}`}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                觀賞作品 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );

  return (
    <div className="group relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] py-2">
      <div className="animate-marquee flex w-max gap-0 group-hover:[animation-play-state:paused]">
        {renderTrack("track-a")}
        {renderTrack("track-b")}
      </div>
    </div>
  );
}
