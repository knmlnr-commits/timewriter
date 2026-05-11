"use client";

import { Plus } from "lucide-react";
import { useSnelInvoer } from "@/components/snel-invoer/snel-invoer-context";

/**
 * Floating Action Button voor mobiele schermen. Op md+ verbergen we 'm
 * omdat de Topbar daar zelf al een snel-invoer knop heeft.
 *
 * Respecteert iOS safe area (notch / home indicator) via env(safe-area-inset-*).
 */
export function MobileFab() {
  const { open } = useSnelInvoer();
  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label="Snelle invoer"
      className="
        md:hidden fixed z-30 right-4 bottom-4
        h-14 w-14 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)]
        shadow-lg active:scale-95 transition-transform
        flex items-center justify-center
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-ring)]
      "
      style={{
        right: "calc(1rem + env(safe-area-inset-right, 0px))",
        bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <Plus className="h-7 w-7" />
    </button>
  );
}
