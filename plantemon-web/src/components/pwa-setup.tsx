"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Registers the service worker and, on iOS, nudges the user to install.
 *
 * iOS never fires beforeinstallprompt and offers no programmatic install, so
 * the only route onto the home screen is Share -> Add to Home Screen. Without
 * a hint most users never discover it — and on iOS an installed PWA is also
 * what protects stored data from the 7-day eviction rule.
 *
 * Whether to show the hint depends entirely on browser state (user agent,
 * display mode, a localStorage flag), so it is modelled as an external store
 * rather than mirrored into React state.
 */

const DISMISSED_KEY = "plantemon:ios-hint-dismissed";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function shouldShowHint(): boolean {
  if (localStorage.getItem(DISMISSED_KEY)) return false;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!isIos) return false;

  // Safari sets navigator.standalone only when launched from the home screen.
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return !standalone;
}

/** False during SSR, so the banner never appears in prerendered HTML. */
const serverSnapshot = () => false;

export function PwaSetup() {
  const showHint = useSyncExternalStore(subscribe, shouldShowHint, serverSnapshot);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => console.warn("Service worker registration failed:", error));
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "1");
    listeners.forEach((listener) => listener());
  }, []);

  if (!showHint) return null;

  return (
    <div className="safe-bottom fixed inset-x-3 bottom-3 z-50">
      <div className="pixel-panel flex items-start gap-3 p-3">
        <p className="flex-1 text-[9px] leading-relaxed">
          Add Plantemon to your Home Screen for full-screen play and to keep your garden safe: tap
          Share, then <strong>Add to Home Screen</strong>.
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="press pixel-button px-2 py-1 text-[9px]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
