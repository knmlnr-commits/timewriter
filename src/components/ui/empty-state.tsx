import * as React from "react";
import { cn } from "@/lib/utils";

type Tint = "brand" | "blue" | "green" | "purple" | "orange" | "teal" | "pink";

const TINT_STYLES: Record<Tint, { bg: string; fg: string }> = {
  brand: { bg: "var(--brand-soft)", fg: "var(--brand)" },
  blue: { bg: "var(--tint-blue)", fg: "var(--tint-blue-fg)" },
  green: { bg: "var(--tint-green)", fg: "var(--tint-green-fg)" },
  purple: { bg: "var(--tint-purple)", fg: "var(--tint-purple-fg)" },
  orange: { bg: "var(--tint-orange)", fg: "var(--tint-orange-fg)" },
  teal: { bg: "var(--tint-teal)", fg: "var(--tint-teal-fg)" },
  pink: { bg: "var(--tint-pink)", fg: "var(--tint-pink-fg)" },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tint = "brand",
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  tint?: Tint;
}) {
  const t = TINT_STYLES[tint];
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 p-8 sm:p-10 text-center",
        className
      )}
    >
      {icon ? (
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: t.bg, color: t.fg }}
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
