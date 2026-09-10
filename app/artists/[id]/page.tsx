"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Palette, Sparkles, Star } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";
import type { ArtistProfile, PortfolioItem } from "@/src/types/artist";
import ArtistGallery from "@/src/components/ArtistGallery";
import PricingTable from "@/src/components/PricingTable";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ArtistPage({ params }: Props) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [artistError, setArtistError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchArtistAndPortfolio = async () => {
      const supabase = getSupabaseClient();

      if (!supabase) {
        if (!isCancelled) {
          setArtist(null);
          setPortfolioItems([]);
          setArtistError("Supabase 尚未設定完成");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setArtistError(null);

      console.log("路由傳入的 Artist ID:", id);

      const { data: artistData, error: fetchedArtistError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      console.log("Profiles 查詢結果:", artistData, fetchedArtistError);

      if (fetchedArtistError || !artistData) {
        if (!isCancelled) {
          setArtist(null);
          setPortfolioItems([]);
          setArtistError(fetchedArtistError?.message ?? "找不到這位繪師");
          setIsLoading(false);
        }
        return;
      }

      const primaryPortfolioQuery = await supabase
        .from("portfolios")
        .select("*")
        .eq("artist_id", id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      let fetchedPortfolioItems = primaryPortfolioQuery.data;
      let fetchedPortfolioError = primaryPortfolioQuery.error;

      const artistIdColumnMissing =
        !!fetchedPortfolioError &&
        /artist_id|column|does not exist/i.test(`${fetchedPortfolioError.message} ${fetchedPortfolioError.details ?? ""}`);

      if (artistIdColumnMissing) {
        const fallbackPortfolioQuery = await supabase
          .from("portfolios")
          .select("*")
          .eq("user_id", id)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false });

        fetchedPortfolioItems = fallbackPortfolioQuery.data;
        fetchedPortfolioError = fallbackPortfolioQuery.error;
      }

      console.log("Portfolio query result:", fetchedPortfolioItems, fetchedPortfolioError);

      if (!isCancelled) {
        const normalized: PortfolioItem[] = ((fetchedPortfolioItems ?? []) as Array<Record<string, unknown>>).map((item) => ({
          ...(item as PortfolioItem),
          artist_id: String((item.artist_id as string | undefined) ?? (item.user_id as string | undefined) ?? id),
        }));

        setArtist(artistData as ArtistProfile);
        setPortfolioItems(normalized);
        setIsLoading(false);
      }
    };

    void fetchArtistAndPortfolio();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const publicPortfolios = useMemo(
    () => portfolioItems.filter((item) => !item.is_internal),
    [portfolioItems],
  );

  const status = artist?.status ?? "idle";
  const statusConfigMap: Record<string, { label: string; className: string }> = {
    idle: { label: "🟢 可接委託", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
    busy: { label: "🟡 爆滿中", className: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" },
    closed: { label: "🔴 暫停接單", className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
  };
  const statusConfig = statusConfigMap[status] ?? statusConfigMap.idle;

  const portfolioCount = publicPortfolios.length;
  const highlightTags = ["角色設計", "品牌聯名", "人設表現", "可愛系風格"];

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] text-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="h-12 w-56 animate-pulse rounded-xl bg-sky-100" />
          <div className="mt-6 h-64 animate-pulse rounded-[32px] bg-white" />
          <div className="mt-6 h-48 animate-pulse rounded-[30px] bg-white" />
        </div>
      </main>
    );
  }

  if (!artist) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">找不到畫師</p>
          <h1 className="mt-4 text-2xl font-black text-slate-900">這位繪師目前還未公開作品集</h1>
          {artistError ? <p className="mt-3 text-sm text-slate-500">{artistError}</p> : null}
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700">
            返回首頁 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowRight className="h-4 w-4 rotate-180" />
          返回首頁
        </Link>

        <section className="mb-10 overflow-hidden rounded-[32px] border border-sky-100 bg-white shadow-[0_24px_80px_rgba(14,116,144,0.08)]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
            <div className="flex items-center justify-center lg:justify-start">
              <div className="h-40 w-40 overflow-hidden rounded-full border-4 border-sky-100 bg-slate-100 shadow-lg sm:h-52 sm:w-52">
                {artist.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.avatar_url} alt={artist.full_name ?? "artist"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100 text-4xl font-black text-sky-700">
                    {(artist.full_name ?? "A").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                {artist.role === "admin" ? "品牌管理者" : "聯名繪師"}
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {artist.full_name ?? "聯名畫師"}
              </h1>

              <div className={`mt-4 inline-flex w-fit items-center rounded-full px-3 py-1.5 text-sm font-semibold ${statusConfig.className}`}>
                {statusConfig.label}
              </div>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                {artist.bio ?? "此繪師尚未填寫自我介紹，歡迎先查看作品集與合作方案。"}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {highlightTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/orders/new?artist=${encodeURIComponent(id)}`}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-700"
                >
                  立即預約 <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-5 py-3 font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  查看方案
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">作品數量</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{portfolioCount}</p>
          </div>
          <div className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">合作風格</p>
            <p className="mt-3 text-xl font-black text-slate-900">角色與 IP 設計</p>
          </div>
          <div className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">合作評價</p>
            <div className="mt-3 flex items-center gap-2 text-slate-900">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-black">4.9</span>
            </div>
          </div>
        </section>

        <section className="mb-10 rounded-[30px] border border-sky-100 bg-white p-6 shadow-[0_20px_60px_rgba(59,130,246,0.04)] sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                <Palette className="h-3.5 w-3.5" />
                作品集
              </p>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">近期創作與設計風格</h2>
            </div>
          </div>

          {publicPortfolios.length > 0 ? (
            <ArtistGallery items={publicPortfolios} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              該繪師尚無上傳作品
            </div>
          )}
        </section>

        <section id="pricing" className="mb-10 rounded-[30px] border border-sky-100 bg-white p-6 shadow-[0_20px_80px_rgba(14,116,144,0.05)] sm:p-8">
          <div className="mb-6">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              方案價目
            </p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">依需求選擇適合的合作方案</h2>
          </div>
          <PricingTable artistId={id} />
        </section>
      </div>
    </main>
  );
}
