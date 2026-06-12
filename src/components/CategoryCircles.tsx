import { Link } from "@tanstack/react-router";
import {
  Baby, CalendarDays, Car, Coffee, Gem, Home, Smartphone, Tag, UtensilsCrossed,
  ShoppingBag, Heart, Sparkles, Bike, Plane, Music, Dumbbell, Briefcase,
  Pizza, Wine, BookOpen, Camera, Gamepad2, PawPrint,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { useCategories, type CategorySlug } from "@/lib/categories";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Tag, UtensilsCrossed, Car, Gem, Smartphone, Home, Baby, Coffee, CalendarDays,
  ShoppingBag, Heart, Sparkles, Bike, Plane, Music, Dumbbell, Briefcase,
  Pizza, Wine, BookOpen, Camera, Gamepad2, PawPrint,
};

type Meta = { bg: string; iconColor: string; ring: string };
const DEFAULT_META: Meta = { bg: "bg-muted", iconColor: "text-foreground", ring: "ring-muted-foreground/30" };

export function CategoryCircles({ activeSlug }: { activeSlug?: CategorySlug | string }) {
  const { t } = useI18n();
  const { data: categories = [] } = useCategories();

  const items = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    Icon: ICONS[c.icon] ?? Tag,
    color: c.color,
    meta: DEFAULT_META,
    label: (t.cat as any)[c.slug] ?? c.name,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      {/* Mobile: horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 pt-1 md:hidden snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ slug, Icon, color, label }) => {
          const isActive = activeSlug === slug;
          return (
            <Link
              key={slug}
              to="/categories/$slug"
              params={{ slug }}
              className={cn("snap-start flex flex-col items-center gap-2 shrink-0", isActive && "opacity-80")}
            >
              <span
                style={{ backgroundColor: color, boxShadow: isActive ? `0 0 0 3px ${color}66` : undefined }}
                className={cn(
                  "flex items-center justify-center rounded-full shadow-md shadow-black/10 transition-all duration-200",
                  isActive ? "scale-95" : "hover:scale-105 hover:shadow-lg hover:shadow-black/15 active:scale-95",
                  "w-[64px] h-[64px]"
                )}
              >
                <Icon className="h-6 w-6 text-white" />
              </span>
              <span className="text-[11px] font-medium text-foreground text-center leading-tight max-w-[64px]">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-8 gap-4 px-4">
        {items.map(({ slug, Icon, color, label }) => {
          const isActive = activeSlug === slug;
          return (
            <Link
              key={slug}
              to="/categories/$slug"
              params={{ slug }}
              className={cn("flex flex-col items-center gap-2.5 transition-opacity", isActive && "opacity-80")}
            >
              <span
                style={{ backgroundColor: color, boxShadow: isActive ? `0 0 0 3px ${color}66` : undefined }}
                className={cn(
                  "flex items-center justify-center rounded-full shadow-md shadow-black/10 transition-all duration-200",
                  isActive ? "scale-95" : "hover:scale-105 hover:shadow-lg hover:shadow-black/15 active:scale-95",
                  "w-[72px] h-[72px]"
                )}
              >
                <Icon className="h-7 w-7 text-white" />
              </span>
              <span className="text-xs font-medium text-foreground text-center leading-tight max-w-[72px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
