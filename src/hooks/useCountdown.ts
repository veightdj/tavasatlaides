import { useState, useEffect } from "react";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  /** True for the final 3 days, including the last 24 hours. */
  endingSoon: boolean;
  totalMs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function getTimeLeft(target: Date): CountdownResult {
  const totalMs = target.getTime() - Date.now();
  if (totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, endingSoon: false, totalMs: 0 };
  }
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
  return {
    days,
    hours,
    minutes,
    seconds,
    expired: false,
    // Cover the entire final 3 days, including the last 24 hours
    // (previously days >= 1 dropped the last day — the most critical window).
    endingSoon: totalMs > 0 && totalMs <= 3 * DAY_MS,
    totalMs,
  };
}

export function useCountdown(endAt: string | null | undefined): CountdownResult | null {
  const [state, setState] = useState<CountdownResult | null>(() =>
    endAt ? getTimeLeft(new Date(endAt)) : null,
  );

  useEffect(() => {
    if (!endAt) {
      setState(null);
      return;
    }
    const target = new Date(endAt);
    if (!Number.isFinite(target.getTime())) {
      setState(null);
      return;
    }
    setState(getTimeLeft(target));
    const id = setInterval(() => {
      setState(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  return state;
}

/**
 * Returns a `Date.now()` value that updates every `intervalMs` (default 1s).
 * Use this when a component needs to re-evaluate time-dependent state
 * (e.g. "is this promotion currently active?") in real time.
 */
export function useNow(intervalMs: number = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Returns whether a promotion is currently active based on its start/end
 * timestamps and status, and re-evaluates each second so the badge flips
 * automatically when the window opens or closes while the UI is visible.
 */
export function useIsLive(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  status?: string | null,
  // Tick once per minute — sub-minute precision isn't meaningful for an
  // "active now" badge and avoids unnecessary re-renders.
  tickMs: number = 60_000,
): boolean {
  const now = useNow(tickMs);
  if (status && status !== "active") return false;
  const startMs = startsAt ? new Date(startsAt).getTime() : null;
  const endMs = endsAt ? new Date(endsAt).getTime() : null;
  if (startMs != null && Number.isFinite(startMs) && startMs > now) return false;
  if (endMs != null && Number.isFinite(endMs) && endMs <= now) return false;
  return true;
}
