"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  Sparkles,
  Users,
  Briefcase,
  FileText,
  UserCircle,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavDrawer } from "./nav-drawer-context";
import { Logo } from "@/components/logo";

const BASE_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/uren/chat", label: "Chat", icon: Sparkles },
  { href: "/uren", label: "Uren", icon: Clock },
  { href: "/klanten", label: "Klanten", icon: Users },
  { href: "/projecten", label: "Projecten", icon: Briefcase },
  { href: "/facturen", label: "Facturen", icon: FileText },
  { href: "/profiel", label: "Profiel", icon: UserCircle },
] as const;

const ADMIN_NAV = { href: "/admin", label: "Beheer", icon: Shield } as const;

export function Sidebar({ naam, isAdmin = false }: { naam: string; isAdmin?: boolean }) {
  const NAV = isAdmin ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV;
  const pathname = usePathname();
  const { open, setOpen } = useNavDrawer();

  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
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
      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-72 flex-col bg-background shadow-xl"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="font-semibold truncate">{naam}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Sluiten"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {renderNav(() => setOpen(false))}
          </aside>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r bg-background">
        <div className="flex h-14 items-center border-b px-4">
          <Logo size="md" />
        </div>
        {renderNav()}
        <div className="mt-auto border-t p-3 text-xs text-muted-foreground truncate">{naam}</div>
      </aside>
    </>
  );
}
