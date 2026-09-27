"use client";
import { useEffect } from "react";
// The moderator holds the phone in one hand in a dark room; an accidental
// pinch should never zoom the screen. The viewport meta covers Android, but
// iOS Safari ignores it, so pinch gestures are also cancelled here.
export function ZoomLock() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const multiTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    // Trackpad pinch arrives as a wheel event with ctrlKey set.
    const pinchWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const options = { passive: false } as const;
    document.addEventListener("gesturestart", stop, options);
    document.addEventListener("gesturechange", stop, options);
    document.addEventListener("touchmove", multiTouch, options);
    window.addEventListener("wheel", pinchWheel, options);
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("touchmove", multiTouch);
      window.removeEventListener("wheel", pinchWheel);
    };
  }, []);
  return null;
}
