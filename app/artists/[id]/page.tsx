import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Palette, Sparkles, Star } from "lucide-react";
import { createServerClient } from "@supabase/ssr";
import type { PortfolioItem, ArtistProfile } from "@/src/types/artist";
import ArtistGallery from "@/src/components/ArtistGallery";
import PricingTable from "@/src/components/PricingTable";

type Props = {
  params: { id: string };
};

export default async function ArtistPage({ params }: Props) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // no-op in server component
          }
        },
      },
    },
  );

  console.log("Artist public page route id:", params.id);

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single<ArtistProfile>();

  console.log("Artist profile query result:", {
    paramsId: params.id,
    profileData,
    profileError,
  });

  if (!profileData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">找不到畫師</p>
          <h1 className="mt-4 text-2xl font-black text-slate-900">這位繪師目前還未公開作品集</h1>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700">
            返回首頁 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const { data: portfolios, error: portfolioError } = await supabase
    .from("portfolios")
    .select("*")
    .eq("artist_id", params.id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  console.log("Artist portfolio query result:", {
    paramsId: params.id,
    portfolios,
    portfolioError,
  });

  const publicPortfolios = (portfolios ?? []).filter((item) => !item.is_internal);

  const status = profileData.status ?? "idle";
  const statusConfigMap: Record<string, { label: string; className: string }> = {
    idle: { label: "🟢 可接委託", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
    busy: { label: "🟡 爆滿中", className: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" },
    closed: { label: "🔴 暫停接單", className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
  };
  const statusConfig = statusConfigMap[status] ?? statusConfigMap.idle;

  const portfolioCount = portfolios?.length ?? 0;
  const highlightTags = ["角色設計", "品牌聯名", "人設表現", "可愛系風格"];

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
                {profileData.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileData.avatar_url} alt={profileData.full_name ?? "artist"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100 text-4xl font-black text-sky-700">
                    {(profileData.full_name ?? "A").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                {profileData.role === "admin" ? "品牌管理者" : "聯名繪師"}
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {profileData.full_name ?? "聯名畫師"}
              </h1>

              <div className={`mt-4 inline-flex w-fit items-center rounded-full px-3 py-1.5 text-sm font-semibold ${statusConfig.className}`}>
                {statusConfig.label}
              </div>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                {profileData.bio ?? "此繪師尚未填寫自我介紹，歡迎先查看作品集與合作方案。"}
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
                  href={`/orders/new?artist=${encodeURIComponent(params.id)}`}
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

          <ArtistGallery items={publicPortfolios} />
        </section>

        <section id="pricing" className="mb-10 rounded-[30px] border border-sky-100 bg-white p-6 shadow-[0_20px_80px_rgba(14,116,144,0.05)] sm:p-8">
          <div className="mb-6">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              方案價目
            </p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">依需求選擇適合的合作方案</h2>
          </div>
          <PricingTable artistId={params.id} />
        </section>
      </div>
    </main>
  );
}
