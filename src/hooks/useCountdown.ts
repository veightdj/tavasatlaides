import { useState, useEffect } from "react";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  endingSoon: boolean;
  totalMs: number;
}

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
    endingSoon: days <= 3 && days >= 1,
    totalMs,
  };
}

export function useCountdown(endAt: string | null | undefined): CountdownResult | null {
  const target = endAt ? new Date(endAt) : null;
  const [state, setState] = useState<CountdownResult | null>(target ? getTimeLeft(target) : null);

  useEffect(() => {
    if (!target) return;
    setState(getTimeLeft(target));
    const id = setInterval(() => {
      setState(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  return state;
}
