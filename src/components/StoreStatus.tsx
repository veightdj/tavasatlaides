import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeStatus, parseHours, todayRange, DAY_LABELS, type Hours } from "@/lib/hours";

type Props = {
  hours: unknown;
  className?: string;
  /** "compact" shows a dot + short label only. "full" shows today's range too. */
  variant?: "compact" | "full";
};

export function StoreStatus({ hours, className, variant = "full" }: Props) {
  // re-render every minute so status stays accurate
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const parsed = parseHours(hours);
  if (!parsed) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Clock className="h-3.5 w-3.5" />
        Hours not set
      </span>
    );
  }

  const status = computeStatus(parsed);
  const range = todayRange(parsed);

  if (status.state === "open") {
    return (
      <Wrapper className={className} dotClass="bg-green-500" labelClass="text-green-700 dark:text-green-400">
        <span className="font-semibold">Open</span>
        {variant === "full" && range && (
          <span className="text-muted-foreground"> · {range}</span>
        )}
      </Wrapper>
    );
  }

  if (status.state === "closing_soon") {
    return (
      <Wrapper className={className} dotClass="bg-orange-500 animate-pulse" labelClass="text-orange-700 dark:text-orange-400">
        <span className="font-semibold">Closing soon</span>
        <span className="text-muted-foreground"> · closes {status.closesAt}</span>
      </Wrapper>
    );
  }

  // closed
  return (
    <Wrapper className={className} dotClass="bg-muted-foreground/50" labelClass="text-muted-foreground">
      <span className="font-semibold">Closed</span>
      {variant === "full" && status.opensAt && status.opensDay && (
        <span> · opens {DAY_LABELS[status.opensDay]} {status.opensAt}</span>
      )}
    </Wrapper>
  );
}

function Wrapper({
  children, className, dotClass, labelClass,
}: { children: React.ReactNode; className?: string; dotClass: string; labelClass: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", labelClass, className)}>
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      {children}
    </span>
  );
}

/** Returns Tailwind classes to decorate a card based on store status. */
export function useStoreCardDecoration(hours: unknown): {
  ring: string;
  dim: string;
  state: "open" | "closing_soon" | "closed" | "unknown";
} {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const parsed = parseHours(hours);
  if (!parsed) return { ring: "", dim: "", state: "unknown" };
  const s = computeStatus(parsed).state;
  if (s === "closing_soon") {
    return {
      ring: "ring-2 ring-orange-400/70 shadow-[0_0_0_4px_rgba(251,146,60,0.15)]",
      dim: "",
      state: s,
    };
  }
  if (s === "closed") {
    return { ring: "", dim: "opacity-70 grayscale-[20%]", state: s };
  }
  return { ring: "", dim: "", state: s };
}

export type { Hours };
