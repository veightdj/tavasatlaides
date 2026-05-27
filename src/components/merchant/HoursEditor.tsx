import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DAYS, DAY_LABELS, DEFAULT_HOURS, parseHours, type DayKey, type Hours } from "@/lib/hours";

type Props = {
  value: unknown;
  onChange: (next: Hours) => void;
};

export function HoursEditor({ value, onChange }: Props) {
  const hours: Hours = parseHours(value) ?? DEFAULT_HOURS;

  const setDay = (d: DayKey, patch: Partial<Hours[DayKey]>) => {
    onChange({ ...hours, [d]: { ...hours[d], ...patch } });
  };

  const applyWeekdays = () => {
    const next = { ...hours };
    const ref = hours.mon;
    (["tue", "wed", "thu", "fri"] as DayKey[]).forEach((d) => (next[d] = { ...ref }));
    onChange(next);
  };

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Working hours</p>
        <Button type="button" variant="ghost" size="sm" onClick={applyWeekdays} className="h-8 text-xs">
          Copy Mon → Tue–Fri
        </Button>
      </div>
      <div className="space-y-2">
        {DAYS.map((d) => {
          const day = hours[d];
          return (
            <div key={d} className="grid grid-cols-[64px_auto_1fr_auto_1fr] items-center gap-2">
              <span className="text-sm font-medium">{DAY_LABELS[d]}</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!day.closed}
                  onCheckedChange={(checked) => setDay(d, { closed: !checked })}
                  aria-label={`${DAY_LABELS[d]} open`}
                />
                <span className="text-xs text-muted-foreground w-12">{day.closed ? "Closed" : "Open"}</span>
              </div>
              <Input
                type="time"
                value={day.open}
                onChange={(e) => setDay(d, { open: e.target.value })}
                disabled={day.closed}
                className="h-9"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="time"
                value={day.close}
                onChange={(e) => setDay(d, { close: e.target.value })}
                disabled={day.closed}
                className="h-9"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
