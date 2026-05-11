import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--brand)] text-[var(--brand-foreground)]",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        soft: "border-transparent bg-[var(--brand-soft)] text-[var(--brand)]",
        muted: "border-transparent bg-muted text-muted-foreground",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        info: "border-blue-200 bg-blue-50 text-blue-800",
        violet: "border-violet-200 bg-violet-50 text-violet-800",
        pink: "border-pink-200 bg-pink-50 text-pink-800",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
