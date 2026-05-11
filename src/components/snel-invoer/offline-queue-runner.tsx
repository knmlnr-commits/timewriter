"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createTijdAction } from "@/app/(app)/uren/actions";
import { peek, remove } from "./offline-queue";

/**
 * Stille runner: probeert bij mount en bij elke `online` event de queue
 * af te werken. Geeft één samenvattende toast, niet één per regel.
 */
export function OfflineQueueRunner() {
  const draining = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function drain() {
      if (draining.current) return;
      if (!navigator.onLine) return;
      const items = peek();
      if (items.length === 0) return;
      draining.current = true;

      let ok = 0;
      let fail = 0;
      for (const item of items) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(item.payload)) fd.set(k, v);
        try {
          const r = await createTijdAction(fd);
          if (r.ok) {
            remove(item.id);
            ok++;
          } else {
            fail++;
          }
        } catch {
          // Netwerk weg tijdens drain - stoppen, wordt opnieuw geprobeerd
          draining.current = false;
          return;
        }
      }
      draining.current = false;

      if (ok > 0) {
        toast.success(`${ok} offline-registratie${ok === 1 ? "" : "s"} verstuurd`);
      }
      if (fail > 0) {
        toast.warning(
          `${fail} registratie${fail === 1 ? "" : "s"} kon niet worden verstuurd. Zie Uren-overzicht.`
        );
      }
    }

    drain();
    window.addEventListener("online", drain);
    window.addEventListener("focus", drain);
    return () => {
      window.removeEventListener("online", drain);
      window.removeEventListener("focus", drain);
    };
  }, []);

  return null;
}
