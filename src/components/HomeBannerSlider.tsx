import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Banner = {
  id: string;
  image_url: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  link_url: string | null;
};

export function HomeBannerSlider() {
  const { data: banners = [] } = useQuery({
    queryKey: ["home-banners"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("banners")
        .select("id,image_url,title,subtitle,cta_text,link_url,starts_at,ends_at,is_active,sort_order")
        .eq("is_active", true)
        .lte("starts_at", nowIso)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Banner[];
    },
    staleTime: 60_000,
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (banners.length === 0) return null;

  return (
    <section className="relative w-full px-3 md:px-6 pt-3 md:pt-5">
      <div className="overflow-hidden rounded-2xl md:rounded-3xl shadow-lg shadow-black/10" ref={emblaRef}>
        <div className="flex">
          {banners.map((b) => {
            const inner = (
              <div className="relative h-[260px] sm:h-[360px] md:h-[460px] w-full">
                <img
                  src={b.image_url}
                  alt={b.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                <div className="relative z-10 mx-auto max-w-6xl h-full px-5 md:px-8 flex flex-col justify-center text-white">
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight max-w-2xl text-balance leading-tight">
                    {b.title}
                  </h2>
                  {b.subtitle && (
                    <p className="mt-3 text-sm sm:text-base md:text-lg text-white/85 max-w-xl">
                      {b.subtitle}
                    </p>
                  )}
                  {b.cta_text && b.link_url && (
                    <span className="mt-5 inline-flex items-center self-start rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow hover:bg-primary/90 transition">
                      {b.cta_text}
                    </span>
                  )}
                </div>
              </div>
            );
            return (
              <div key={b.id} className="min-w-0 flex-[0_0_100%]">
                {b.link_url ? (
                  <a href={b.link_url} className="block">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => emblaApi?.scrollPrev()}
            className="hidden md:grid absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 place-items-center rounded-full bg-white/85 hover:bg-white text-foreground shadow"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => emblaApi?.scrollNext()}
            className="hidden md:grid absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 place-items-center rounded-full bg-white/85 hover:bg-white text-foreground shadow"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {snaps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === selected ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
