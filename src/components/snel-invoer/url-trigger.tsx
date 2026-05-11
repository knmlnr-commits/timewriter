"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSnelInvoer } from "./snel-invoer-context";

/**
 * Opent de snelle-invoer modal automatisch wanneer een URL met ?snel=1
 * wordt geopend. Gebruikt door de PWA "shortcut" in manifest.webmanifest
 * zodat een long-press op het home screen-icoon direct in de invoer kan
 * landen.
 *
 * Verwijdert daarna de query-param zodat refresh/back niet opnieuw de
 * modal opent.
 */
export function UrlTrigger() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useSnelInvoer();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (sp.get("snel") === "1") {
      done.current = true;
      open();
      const next = new URLSearchParams(sp.toString());
      next.delete("snel");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }, [sp, open, router, pathname]);

  return null;
}
