import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CATEGORY_LABEL: Record<string, string> = {
  food: "Restorāns",
  cafes: "Kafejnīca",
  beauty: "Skaistums",
  auto: "Auto",
  electronics: "Elektronika",
  home: "Mājai",
  kids: "Bērniem",
  events: "Pasākumi",
};

type Store = {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
  is_verified: boolean | null;
};

export function PopularStores() {
  const { data: stores = [] } = useQuery({
    queryKey: ["popular-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,slug,category,logo_url,is_verified")
        .eq("is_hidden", false)
        .eq("is_blocked", false)
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as Store[];
    },
    staleTime: 60_000,
  });

  if (stores.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-3 md:py-5">
      <div className="flex items-end justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight">Populāri veikali</h2>
        <Link to="/stores" className="text-sm text-primary font-medium hover:underline shrink-0">
          Skatīt visus →
        </Link>
      </div>
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
        <ul className="flex gap-4 pb-2 snap-x snap-mandatory">
          {stores.map((s) => (
            <li key={s.id} className="snap-start shrink-0 w-[88px]">
              <Link to="/stores/$id" params={{ id: s.id }} className="group block text-center">
                <div className="relative mx-auto h-[72px] w-[72px]">
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      loading="lazy"
                      className="h-[72px] w-[72px] rounded-full object-cover ring-2 ring-border group-hover:ring-primary transition"
                    />
                  ) : (
                    <div className="h-[72px] w-[72px] rounded-full bg-gradient-warm grid place-items-center text-primary-foreground font-bold text-xl ring-2 ring-border">
                      {s.name[0]}
                    </div>
                  )}
                  {s.is_verified && (
                    <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center h-5 w-5 rounded-full bg-background">
                      <BadgeCheck className="h-5 w-5 text-sky-500 fill-sky-500/15" />
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold leading-tight line-clamp-2 group-hover:text-primary transition">
                  {s.name}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                  {CATEGORY_LABEL[s.category] ?? s.category}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
