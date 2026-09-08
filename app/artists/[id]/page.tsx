import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { PortfolioItem, ArtistProfile } from "@/src/types/artist";
import ArtistGallery from "@/src/components/ArtistGallery";
import PricingTable from "@/src/components/PricingTable";

type Props = {
  params: { id: string };
};

export default async function ArtistPage({ params }: Props) {
  const supabase = createServerComponentClient({ cookies });

  const { data: profileData } = await supabase.from<ArtistProfile>("profiles").select("*").eq("id", params.id).maybeSingle();

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">找不到該繪師。</div>
      </div>
    );
  }

  const { data: portfolios } = await supabase
    .from<PortfolioItem>("portfolios")
    .select("*")
    .eq("artist_id", params.id)
    .order("created_at", { ascending: false });

  const status = profileData.status ?? "idle";

  const statusBadge = () => {
    if (status === "idle") return <span className="text-green-600">🟢 可接委託</span>;
    if (status === "busy") return <span className="text-yellow-600">🟡 爆滿中</span>;
    return <span className="text-red-600">🔴 暫停接單</span>;
  };

  return (
    <main className="max-w-6xl mx-auto p-6">
      <section className="flex items-center gap-6 mb-8">
        <div className="h-28 w-28 rounded-full overflow-hidden border">
          {profileData.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profileData.avatar_url} alt={profileData.full_name ?? "artist"} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">暫無</div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold">{profileData.full_name ?? profileData.id}</h1>
          <div className="mt-1">{statusBadge()}</div>
          <p className="mt-3 text-sm text-slate-700 max-w-3xl">{profileData.bio ?? "此繪師尚未填寫自我介紹。"}</p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">作品集</h2>
        <ArtistGallery items={portfolios ?? []} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">方案價目表</h2>
        <PricingTable artistId={params.id} />
      </section>
    </main>
  );
}
