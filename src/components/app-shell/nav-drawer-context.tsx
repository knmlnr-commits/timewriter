"use client";

import { createContext, useContext, useState } from "react";

type NavDrawerCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

const Ctx = createContext<NavDrawerCtx | null>(null);

export function NavDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open, setOpen, toggle: () => setOpen((v) => !v) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNavDrawer(): NavDrawerCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNavDrawer outside provider");
  return c;
}
