import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { useI18n } from "@/i18n/use-i18n";
import { useFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Favorites — TavasAtlaides" },
      { name: "description", content: "Your saved deals on TavasAtlaides." },
      { property: "og:title", content: "Favorites — TavasAtlaides" },
      { property: "og:description", content: "Your saved deals on TavasAtlaides." },
      { property: "og:url", content: "https://superatlaides.lovable.app/favorites" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/favorites" }],
  }),
  component: Favorites,
});

function Favorites() {
  const { t } = useI18n();
  const { ids } = useFavorites();

  const { data: deals = [] } = useQuery({
    queryKey: ["favs", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,stores(id,name,city,slug,logo_url,is_verified,category,hours_json,lat,lng,address)")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.favorites.title}</h1>
      {ids.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed p-12 text-center text-muted-foreground">{t.favorites.empty}</div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {deals.map((a: any) => <DealCard key={a.id} deal={a} />)}
        </div>
      )}
    </div>
  );
}
