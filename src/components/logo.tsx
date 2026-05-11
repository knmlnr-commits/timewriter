import { cn } from "@/lib/utils";

/**
 * Logo / wordmark voor time-app.nl
 *
 * Gebruik:
 *   <Logo />               compacte versie (alleen "time-app.nl")
 *   <Logo size="lg" />     groot voor login/marketing
 *   <Logo iconOnly />      enkel icoon (favicon-stijl)
 */
export function Logo({
  size = "md",
  iconOnly = false,
  className,
  withDomain = true,
}: {
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  className?: string;
  withDomain?: boolean;
}) {
  const iconSize =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-7 w-7";
  const textSize =
    size === "sm" ? "text-sm" : size === "lg" ? "text-3xl" : "text-base";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-[var(--brand-foreground)] shadow-sm",
          iconSize
        )}
        aria-hidden
      >
        <Clock className="h-[60%] w-[60%]" />
      </span>
      {iconOnly ? null : (
        <span className={cn("font-semibold tracking-tight leading-none", textSize)}>
          time-app
          {withDomain ? (
            <span className="text-[var(--brand)] font-bold">.nl</span>
          ) : null}
        </span>
      )}
    </span>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
