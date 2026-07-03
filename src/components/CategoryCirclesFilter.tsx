import {
  Baby, CalendarDays, Car, Coffee, Gem, Home, Smartphone, Tag, UtensilsCrossed,
  ShoppingBag, Heart, Sparkles, Bike, Plane, Music, Dumbbell, Briefcase,
  Pizza, Wine, BookOpen, Camera, Gamepad2, PawPrint,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { useCategories, localizedCategoryName } from "@/lib/categories";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Tag, UtensilsCrossed, Car, Gem, Smartphone, Home, Baby, Coffee, CalendarDays,
  ShoppingBag, Heart, Sparkles, Bike, Plane, Music, Dumbbell, Briefcase,
  Pizza, Wine, BookOpen, Camera, Gamepad2, PawPrint,
};

type Props = {
  activeSlug: string;
  onSelect: (slug: string) => void;
};

export function CategoryCirclesFilter({ activeSlug, onSelect }: Props) {
  const { lang } = useI18n();
  const { data: categories = [] } = useCategories();

  const items: Array<{ slug: string; label: string; Icon: LucideIcon; color: string }> = [
    ...categories.map((c) => ({
      slug: c.slug,
      label: localizedCategoryName(c, lang),
      Icon: ICONS[c.icon] ?? Tag,
      color: c.color,
    })),
  ];

  return (
    <div
      className="flex gap-4 overflow-x-auto px-4 py-3 snap-x scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Categories"
    >
      {items.map(({ slug, label, Icon, color }) => {
        const isActive = activeSlug === slug;
        return (
          <button
            key={slug}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(slug)}
            className={cn(
              "snap-start flex flex-col items-center gap-1.5 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl",
            )}
          >
            <span
              style={{
                backgroundColor: color,
                boxShadow: isActive
                  ? `0 0 0 3px hsl(var(--background)), 0 0 0 6px ${color}, 0 8px 20px -6px ${color}80`
                  : undefined,
              }}
              className={cn(
                "flex items-center justify-center rounded-full shadow-md shadow-black/10 transition-all duration-300 ease-out",
                "w-[68px] h-[68px]",
                isActive ? "scale-110" : "hover:scale-105 active:scale-95",
              )}
            >
              <Icon className="h-7 w-7 text-white" />
            </span>
            <span
              className={cn(
                "text-[11px] text-center leading-tight max-w-[72px] transition-colors",
                isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
