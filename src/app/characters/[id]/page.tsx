import CharacterDetailView from "@/src/components/CharacterDetailView";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CharacterDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <CharacterDetailView characterId={id} />;
}
