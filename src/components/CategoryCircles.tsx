import { Link } from "@tanstack/react-router";
import {
  Baby,
  CalendarDays,
  Car,
  Coffee,
  Gem,
  Home,
  Smartphone,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { useCategories, type CategorySlug } from "@/lib/categories";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed, Car, Gem, Smartphone, Home, Baby, Coffee, CalendarDays, Tag,
};

type Meta = { bg: string; iconColor: string; ring: string };

const CATEGORY_META: Record<string, Meta> = {
  food:        { bg: "bg-[oklch(0.65_0.16_55)]",  iconColor: "text-white", ring: "ring-[oklch(0.65_0.16_55)]/40" },
  auto:        { bg: "bg-[oklch(0.6_0.12_245)]",  iconColor: "text-white", ring: "ring-[oklch(0.6_0.12_245)]/40" },
  beauty:      { bg: "bg-[oklch(0.7_0.14_345)]",  iconColor: "text-white", ring: "ring-[oklch(0.7_0.14_345)]/40" },
  electronics: { bg: "bg-[oklch(0.6_0.14_295)]",  iconColor: "text-white", ring: "ring-[oklch(0.6_0.14_295)]/40" },
  home:        { bg: "bg-[oklch(0.65_0.12_145)]", iconColor: "text-white", ring: "ring-[oklch(0.65_0.12_145)]/40" },
  kids:        { bg: "bg-[oklch(0.75_0.16_85)]",  iconColor: "text-white", ring: "ring-[oklch(0.75_0.16_85)]/40" },
  cafes:       { bg: "bg-[oklch(0.55_0.1_55)]",   iconColor: "text-white", ring: "ring-[oklch(0.55_0.1_55)]/40" },
  events:      { bg: "bg-[oklch(0.65_0.16_25)]",  iconColor: "text-white", ring: "ring-[oklch(0.65_0.16_25)]/40" },
};
const DEFAULT_META: Meta = { bg: "bg-muted", iconColor: "text-foreground", ring: "ring-muted-foreground/30" };

export function CategoryCircles({ activeSlug }: { activeSlug?: CategorySlug | string }) {
  const { t } = useI18n();
  const { data: categories = [] } = useCategories();

  const items = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    Icon: ICONS[c.icon] ?? Tag,
    meta: CATEGORY_META[c.slug] ?? DEFAULT_META,
    label: (t.cat as any)[c.slug] ?? c.name,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      {/* Mobile: horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 pt-1 md:hidden snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ slug, Icon, meta, label }) => {
          const isActive = activeSlug === slug;
          return (
            <Link
              key={slug}
              to="/categories/$slug"
              params={{ slug }}
              className={cn("snap-start flex flex-col items-center gap-2 shrink-0", isActive && "opacity-80")}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full shadow-md shadow-black/10 transition-all duration-200",
                  meta.bg,
                  isActive ? `ring-[3px] ${meta.ring} scale-95` : "hover:scale-105 hover:shadow-lg hover:shadow-black/15 active:scale-95",
                  "w-[64px] h-[64px]"
                )}
              >
                <Icon className={cn("h-6 w-6", meta.iconColor)} />
              </span>
              <span className="text-[11px] font-medium text-foreground text-center leading-tight max-w-[64px]">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-8 gap-4 px-4">
        {items.map(({ slug, Icon, meta, label }) => {
          const isActive = activeSlug === slug;
          return (
            <Link
              key={slug}
              to="/categories/$slug"
              params={{ slug }}
              className={cn("flex flex-col items-center gap-2.5 transition-opacity", isActive && "opacity-80")}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full shadow-md shadow-black/10 transition-all duration-200",
                  meta.bg,
                  isActive ? `ring-[3px] ${meta.ring} scale-95` : "hover:scale-105 hover:shadow-lg hover:shadow-black/15 active:scale-95",
                  "w-[72px] h-[72px]"
                )}
              >
                <Icon className={cn("h-7 w-7", meta.iconColor)} />
              </span>
              <span className="text-xs font-medium text-foreground text-center leading-tight max-w-[72px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
