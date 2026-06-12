import {
  Baby, CalendarDays, Car, Coffee, Gem, Home, Smartphone, Tag, UtensilsCrossed,
  ShoppingBag, Heart, Sparkles, Bike, Plane, Music, Dumbbell, Briefcase,
  Pizza, Wine, BookOpen, Camera, Gamepad2, PawPrint, LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { useCategories } from "@/lib/categories";
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

export function CategoryPills({ activeSlug, onSelect }: Props) {
  const { t } = useI18n();
  const { data: categories = [] } = useCategories();

  const items: Array<{ slug: string; label: string; Icon: LucideIcon; color?: string }> = [
    { slug: "all", label: (t.cat as any).all ?? "All", Icon: LayoutGrid },
    ...categories.map((c) => ({
      slug: c.slug,
      label: (t.cat as any)[c.slug] ?? c.name,
      Icon: ICONS[c.icon] ?? Tag,
      color: c.color,
    })),
  ];

  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 py-2 snap-x scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Categories"
    >
      {items.map(({ slug, label, Icon, color }) => {
        const isActive = activeSlug === slug;
        const activeBg = color ?? "hsl(var(--primary))";
        return (
          <button
            key={slug}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(slug)}
            style={
              isActive
                ? { backgroundColor: activeBg, boxShadow: `0 0 0 3px ${color ? `${color}33` : "hsl(var(--primary) / 0.2)"}` }
                : undefined
            }
            className={cn(
              "snap-start shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              isActive
                ? "text-white scale-[1.02]"
                : "bg-muted/60 text-foreground hover:bg-muted active:scale-95"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
