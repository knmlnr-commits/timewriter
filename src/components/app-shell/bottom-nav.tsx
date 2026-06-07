"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, LayoutDashboard, Plus, Receipt, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSnelInvoer } from "@/components/snel-invoer/snel-invoer-context";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/uren", label: "Uren", icon: Clock },
  { href: "/uren/chat", label: "Chat", icon: Sparkles },
  { href: "/bonnetjes", label: "Bonnen", icon: Receipt },
] as const;

/**
 * Mobiele bottom navigation met centrale plus-knop voor de snel-invoer.
 * Layout: [Home] [Uren] [+] [Klanten] [Facturen]. Enkel zichtbaar onder
 * md (768px). Op iOS-toestellen wordt safe-area onder de home indicator
 * gerespecteerd.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { open } = useSnelInvoer();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Hoofdnavigatie"
    >
      <div className="grid grid-cols-5 h-16">
        <NavItem item={ITEMS[0]} pathname={pathname} />
        <NavItem item={ITEMS[1]} pathname={pathname} />
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => open()}
            aria-label="Snelle invoer"
            className="
              -mt-6 h-14 w-14 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)]
              shadow-lg active:scale-95 transition-transform
              flex items-center justify-center
              focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-ring)]
            "
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>
        <NavItem item={ITEMS[2]} pathname={pathname} />
        <NavItem item={ITEMS[3]} pathname={pathname} />
      </div>
    </nav>
  );
}

function NavItem({
  item,
  pathname,
}: {
  item: (typeof ITEMS)[number];
  pathname: string;
}) {
  const active =
    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
        active
          ? "text-[var(--brand)]"
          : "text-muted-foreground active:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
          active ? "bg-[var(--brand-soft)]" : "bg-transparent"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      {item.label}
    </Link>
  );
}
