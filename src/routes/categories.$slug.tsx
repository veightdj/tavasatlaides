import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { useI18n } from "@/i18n/use-i18n";
import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/categories";

const CATEGORY_LABEL: Record<string, string> = {
  food: "Food & drinks",
  groceries: "Groceries",
  clothing: "Clothing",
  beauty: "Beauty",
  home: "Home",
  services: "Services",
  entertainment: "Entertainment",
  health: "Health",
  other: "Other",
};

export const Route = createFileRoute("/categories/$slug")({
  head: ({ params }) => {
    const label = CATEGORY_LABEL[params.slug] ?? params.slug;
    const title = `${label} deals — DealsLV`;
    const desc = `Active ${label.toLowerCase()} discounts and promotions in Riga & Jurmala.`;
    const url = `https://superatlaides.lovable.app/categories/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { t } = useI18n();

  const valid = (CATEGORY_SLUGS as readonly string[]).includes(slug);

  const { data: ads = [] } = useQuery({
    queryKey: ["category", slug],
    enabled: valid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,stores(id,name,city,slug)")
        .eq("status", "active")
        .eq("category", slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!valid) return <div className="p-10 text-center">404</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{(t.cat as any)[slug as CategorySlug]}</h1>
      <p className="mt-2 text-muted-foreground">{t.deals.title}</p>
      {ads.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed p-12 text-center text-muted-foreground">{t.deals.empty}</div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ads.map((a: any) => <DealCard key={a.id} deal={a} />)}
        </div>
      )}
    </div>
  );
}
