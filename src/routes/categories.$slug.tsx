import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { useI18n } from "@/i18n/use-i18n";
import { useCategories, localizedCategoryName, type CategorySlug } from "@/lib/categories";
import { CategoryCircles } from "@/components/CategoryCircles";

export const Route = createFileRoute("/categories/$slug")({
  head: ({ params }) => {
    const url = `https://tavasatlaides.lv/categories/${params.slug}`;
    return {
      meta: [
        { title: `${params.slug} — TavasAtlaides` },
        { property: "og:url", content: url },
        { name: "robots", content: "index,follow" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const { data: cats, isLoading: catsLoading } = useCategories();

  const row = (cats ?? []).find((c) => c.slug === slug);
  const valid = !catsLoading && !!row;
  const label = row ? localizedCategoryName(row, lang) : slug;

  const { data: ads = [] } = useQuery({
    queryKey: ["category", slug],
    enabled: valid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,stores(id,name,city,slug,logo_url,is_verified,category,hours_json,lat,lng,address)")
        .eq("status", "active")
        .eq("category", slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (catsLoading) return <div className="p-10 text-center text-muted-foreground">{t.common.loading}</div>;
  if (!valid) return <div className="p-10 text-center">{t.common.notFound ?? slug}</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight px-4">{label}</h1>
      <p className="mt-1 text-muted-foreground px-4">{t.deals.title}</p>

      <div className="mt-6 mb-8">
        <CategoryCircles activeSlug={slug as CategorySlug} />
      </div>

      {ads.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed p-12 text-center text-muted-foreground">{t.deals.empty}</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ads.map((a: any) => <DealCard key={a.id} deal={a} />)}
        </div>
      )}
    </div>
  );
}
