"use client";

import { Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSnelInvoer } from "@/components/snel-invoer/snel-invoer-context";

export function Topbar({ email, version }: { email: string; version: string }) {
  const { open } = useSnelInvoer();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground select-none">
        v{version}
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={() => open()} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Snelle invoer</span>
          <span className="hidden md:inline text-[10px] opacity-70">⌘N</span>
        </Button>
        <form action="/api/auth/logout" method="post">
          <Button variant="ghost" size="icon" type="submit" aria-label="Uitloggen" title={email}>
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
