"use client";

import { useEffect, useState } from "react";

const MIN_UNITS_LEFT = 1;
const COUNTDOWN_INTERVAL_MS = 60 * 1000;

function clampUnits(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(MIN_UNITS_LEFT, parsed);
}

export default function UrgencyCountdown({ productId, unitsLeft }) {
  const configuredUnits = clampUnits(unitsLeft);
  const storageKey = `odinaka:urgency-units:${productId}:${configuredUnits}`;
  const [currentUnits, setCurrentUnits] = useState(configuredUnits);

  useEffect(() => {
    if (configuredUnits === null) return undefined;

    let restoreTimer = null;
    try {
      const storedUnits = clampUnits(window.localStorage.getItem(storageKey));
      if (storedUnits !== null) {
        restoreTimer = window.setTimeout(() => {
          setCurrentUnits(Math.min(configuredUnits, storedUnits));
        }, 0);
      }
    } catch {
      // Continue with the configured value when storage is unavailable.
    }

    const timer = window.setInterval(() => {
      setCurrentUnits((value) => {
        const nextValue = Math.max(MIN_UNITS_LEFT, Number(value) - 1);
        try {
          window.localStorage.setItem(storageKey, String(nextValue));
        } catch {
          // The countdown remains clamped even when storage is unavailable.
        }
        return nextValue;
      });
    }, COUNTDOWN_INTERVAL_MS);

    return () => {
      if (restoreTimer !== null) window.clearTimeout(restoreTimer);
      window.clearInterval(timer);
    };
  }, [configuredUnits, storageKey]);

  if (configuredUnits === null || currentUnits === null) return null;

  const unitLabel = currentUnits === MIN_UNITS_LEFT ? "Unit" : "Units";

  return (
    <div aria-live="polite" aria-label={`${currentUnits} ${unitLabel} Left`}>
      <div className="text-4xl font-black leading-none text-red-600">{currentUnits}</div>
      <div className="mt-1 text-[11px] font-black uppercase tracking-widest text-slate-700">{unitLabel} Left</div>
    </div>
  );
}
