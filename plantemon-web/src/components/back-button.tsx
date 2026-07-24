"use client";

import { useRouter } from "next/navigation";

/**
 * Stands in for the `← Back` button every activity wired to finish().
 *
 * Falls back to the home route when there is no history to pop — which is the
 * common case for an installed PWA opened straight onto a deep link.
 */
export function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/home");
      }}
      className={`press pixel-button px-3 py-2 text-xs ${className}`}
    >
      ← Back
    </button>
  );
}
