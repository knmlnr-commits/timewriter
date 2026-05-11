"use client";

import { LogOut, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSnelInvoer } from "@/components/snel-invoer/snel-invoer-context";
import { useNavDrawer } from "./nav-drawer-context";

export function Topbar({ email, version }: { email: string; version: string }) {
  const { open } = useSnelInvoer();
  const { setOpen: setDrawerOpen } = useNavDrawer();
  return (
    <header
      className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-3 backdrop-blur md:px-6"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10"
          onClick={() => setDrawerOpen(true)}
          aria-label="Menu openen"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground select-none">
          v{version}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => open()}
          size="sm"
          aria-label="Snelle invoer"
          className="gap-2 h-10 w-10 sm:h-9 sm:w-auto sm:px-4"
        >
          <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Snelle invoer</span>
          <span className="hidden md:inline text-[10px] opacity-70">⌘N</span>
        </Button>
        <form action="/api/auth/logout" method="post">
          <Button
            variant="ghost"
            size="icon"
            type="submit"
            aria-label="Uitloggen"
            title={email}
            className="h-10 w-10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
