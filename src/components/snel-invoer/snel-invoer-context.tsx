"use client";

import * as React from "react";
import type { Klant, Project } from "@/lib/types";

type SnelInvoerCtx = {
  open: (preset?: { project_id?: string; datum?: string }) => void;
  close: () => void;
  isOpen: boolean;
  preset: { project_id?: string; datum?: string } | null;
  projecten: Project[];
  klanten: Klant[];
};

const Ctx = React.createContext<SnelInvoerCtx | null>(null);

export function SnelInvoerProvider({
  projecten,
  klanten,
  children,
}: {
  projecten: Project[];
  klanten: Klant[];
  children: React.ReactNode;
}) {
  const [isOpen, setOpen] = React.useState(false);
  const [preset, setPreset] = React.useState<SnelInvoerCtx["preset"]>(null);

  const open = React.useCallback((p?: SnelInvoerCtx["preset"]) => {
    setPreset(p ?? null);
    setOpen(true);
  }, []);
  const close = React.useCallback(() => {
    setOpen(false);
    setPreset(null);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={{ open, close, isOpen, preset, projecten, klanten }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSnelInvoer() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useSnelInvoer outside provider");
  return ctx;
}
