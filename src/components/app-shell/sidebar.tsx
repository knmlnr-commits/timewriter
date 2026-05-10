"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Clock,
  Users,
  Briefcase,
  FileText,
  UserCircle,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/uren", label: "Uren", icon: Clock },
  { href: "/klanten", label: "Klanten", icon: Users },
  { href: "/projecten", label: "Projecten", icon: Briefcase },
  { href: "/facturen", label: "Facturen", icon: FileText },
  { href: "/profiel", label: "Profiel", icon: UserCircle },
] as const;

export function Sidebar({ naam }: { naam: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-[var(--brand-soft)] text-[var(--brand)] font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden sticky top-0 z-30 flex h-12 items-center justify-between border-b bg-background px-3">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Menu openen">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium">TijdRegistratie</span>
        <span className="w-9" />
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-background shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="font-semibold">{naam}</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Sluiten">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      {/* Desktop */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r bg-background">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-lg font-semibold tracking-tight">TijdRegistratie</span>
        </div>
        {nav}
        <div className="mt-auto border-t p-3 text-xs text-muted-foreground">{naam}</div>
      </aside>
    </>
  );
}
