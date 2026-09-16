import ArtistOrderDetailView from "@/src/components/ArtistOrderDetailView";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ArtistOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <ArtistOrderDetailView orderId={id} />;
}
