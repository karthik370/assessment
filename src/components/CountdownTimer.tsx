"use client";

import { useEffect, useRef } from "react";
import { Timer } from "lucide-react";

interface CountdownTimerProps {
  expiresAt: string | Date;
  size?: "sm" | "md" | "lg";
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "Expired";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

// Returns what urgency class to apply
function getUrgencyClass(ms: number): string {
  if (ms <= 0) return "countdown-critical";
  if (ms < 30 * 60 * 1000) return "countdown-critical"; // < 30 min
  if (ms < 2 * 60 * 60 * 1000) return "countdown-warning"; // < 2 hours
  return "countdown-ok";
}

export default function CountdownTimer({ expiresAt, size = "md" }: CountdownTimerProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const expiryMs = new Date(expiresAt).getTime();

  useEffect(() => {
    function tick() {
      const remaining = expiryMs - Date.now();
      if (spanRef.current) {
        spanRef.current.textContent = formatDuration(remaining);
        spanRef.current.className = getUrgencyClass(remaining);
        if (remaining <= 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expiryMs]);

  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-lg font-bold" : "text-sm font-semibold";

  return (
    <span className={`inline-flex items-center gap-1 ${textSize} font-mono`}>
      <Timer className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      <span ref={spanRef} className={getUrgencyClass(expiryMs - Date.now())}>
        {formatDuration(expiryMs - Date.now())}
      </span>
    </span>
  );
}
