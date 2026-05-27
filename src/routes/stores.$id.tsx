import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DealCard } from "@/components/DealCard";
import { StoreStatus } from "@/components/StoreStatus";
import { useI18n } from "@/i18n/use-i18n";

export const Route = createFileRoute("/stores/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("stores")
      .select("name,city,description,logo_url,cover_image_url")
      .eq("id", params.id)
      .maybeSingle();
    return { store: data };
  },
  head: ({ params, loaderData }) => {
    const s = loaderData?.store;
    const title = s ? `${s.name} — Deals in ${s.city ?? "Latvia"} — TavasAtlaides` : "Store — TavasAtlaides";
    const desc = s?.description?.slice(0, 160) || (s ? `See all active deals from ${s.name}${s.city ? ` in ${s.city}` : ""}.` : "Local store on TavasAtlaides.");
    const url = `https://superatlaides.lovable.app/stores/${params.id}`;
    const image = s?.cover_image_url || s?.logo_url || undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(image ? [
          { property: "og:image", content: image },
          { name: "twitter:image", content: image },
        ] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: StorePage,
});

function StorePage() {
  const { id } = Route.useParams();
  const { t } = useI18n();

  const { data: store } = useQuery({
    queryKey: ["store", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: ads = [] } = useQuery({
    queryKey: ["store-ads", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,category,discount_pct,price_original,price_sale,cover_image_url,ends_at,stores(id,name,city,slug)")
        .eq("store_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!store) return <div className="p-10 text-center text-muted-foreground">{t.common.loading}</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-start gap-5">
        {store.logo_url ? (
          <img src={store.logo_url} alt={store.name} className="h-20 w-20 rounded-2xl object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-2xl bg-gradient-warm grid place-items-center text-primary-foreground font-bold text-2xl">{store.name[0]}</div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{store.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{store.address}, {store.city}</span>
            {store.phone && <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" />{store.phone}</span>}
            {store.website && (
              <a href={store.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                <Globe className="h-4 w-4" />{store.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
          {store.description && <p className="mt-4 text-foreground/80 max-w-2xl">{store.description}</p>}
        </div>
      </div>

      <h2 className="mt-10 text-2xl font-bold">{t.home.featured}</h2>
      {ads.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t.deals.empty}</p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((a: any) => <DealCard key={a.id} deal={a} />)}
        </div>
      )}
    </div>
  );
}
