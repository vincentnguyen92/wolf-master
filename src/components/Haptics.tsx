"use client";
import { useEffect } from "react";
// A short buzz on every tap of a button, switch or link, so controls feel
// pressed. Android browsers have the Vibration API. Safari on iPhone does
// not, but since iOS 18 flipping a native switch (<input switch>) plays a
// light system haptic, so there a hidden switch is flipped on each tap. That
// is a platform quirk, not an API: older iOS simply stays silent.
const TAP_MS = 10;
const CONTROLS =
  "button, a[href], [role='switch'], [role='tab'], summary, label";
export function Haptics() {
  useEffect(() => {
    let buzz: () => void;
    let hidden: HTMLLabelElement | undefined;
    if (typeof navigator.vibrate === "function") {
      buzz = () => navigator.vibrate(TAP_MS);
    } else {
      hidden = document.createElement("label");
      hidden.dataset.haptic = "";
      hidden.setAttribute("aria-hidden", "true");
      hidden.style.display = "none";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.tabIndex = -1;
      input.setAttribute("switch", "");
      hidden.append(input);
      document.body.append(hidden);
      const label = hidden;
      buzz = () => label.click();
    }
    const tap = (e: MouseEvent) => {
      const target = e.target as Element | null;
      // The hidden switch's own click must not trigger another buzz.
      if (!target || target.closest("[data-haptic]")) return;
      const control = target.closest(CONTROLS);
      if (!control || control.matches(":disabled, [aria-disabled='true']"))
        return;
      buzz();
    };
    document.addEventListener("click", tap, true);
    return () => {
      document.removeEventListener("click", tap, true);
      hidden?.remove();
    };
  }, []);
  return null;
}
