"use client";
import { useEffect } from "react";
// A short buzz on every tap of a button, switch or link, so controls feel
// pressed. Uses the Vibration API, which Android browsers support; Safari on
// iPhone does not expose it, so there the tap simply stays silent.
const TAP_MS = 10;
export function Haptics() {
  useEffect(() => {
    if (typeof navigator.vibrate !== "function") return;
    const tap = (e: MouseEvent) => {
      const target = (e.target as Element | null)?.closest(
        "button, a[href], [role='switch'], [role='tab'], summary, label",
      );
      if (!target || target.matches(":disabled, [aria-disabled='true']"))
        return;
      navigator.vibrate(TAP_MS);
    };
    document.addEventListener("click", tap, true);
    return () => document.removeEventListener("click", tap, true);
  }, []);
  return null;
}
