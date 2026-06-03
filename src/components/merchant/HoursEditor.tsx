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
    <div className="w-full max-w-full min-w-0 box-border space-y-3 rounded-xl border bg-card p-3 md:p-4 overflow-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <p className="text-sm font-medium">Working hours</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={applyWeekdays}
          className="h-8 text-xs self-start sm:self-auto"
        >
          Copy Mon → Tue–Fri
        </Button>
      </div>
      <div className="space-y-2 min-w-0">
        {DAYS.map((d) => {
          const day = hours[d];
          return (
            <div
              key={d}
              className="w-full min-w-0 box-border flex flex-col gap-2 rounded-lg border border-border/50 p-2 sm:grid sm:grid-cols-[56px_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-2 sm:border-0 sm:p-0"
            >
              <span className="text-sm font-medium">{DAY_LABELS[d]}</span>
              <div className="flex items-center gap-2 min-w-0">
                <Switch
                  checked={!day.closed}
                  onCheckedChange={(checked) => setDay(d, { closed: !checked })}
                  aria-label={`${DAY_LABELS[d]} open`}
                />
                <span className="text-xs text-muted-foreground w-12 shrink-0">
                  {day.closed ? "Closed" : "Open"}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0 w-full">
                <Input
                  type="time"
                  value={day.open}
                  onChange={(e) => setDay(d, { open: e.target.value })}
                  disabled={day.closed}
                  className="h-9 w-full min-w-0 max-w-full appearance-none"
                />
                <span className="text-muted-foreground text-xs shrink-0 sm:hidden">→</span>
                <Input
                  type="time"
                  value={day.close}
                  onChange={(e) => setDay(d, { close: e.target.value })}
                  disabled={day.closed}
                  className="h-9 w-full min-w-0 max-w-full appearance-none sm:hidden"
                />
              </div>
              <span className="text-muted-foreground text-xs hidden sm:block">to</span>
              <Input
                type="time"
                value={day.close}
                onChange={(e) => setDay(d, { close: e.target.value })}
                disabled={day.closed}
                className="hidden sm:flex h-9 w-full min-w-0 max-w-full appearance-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
