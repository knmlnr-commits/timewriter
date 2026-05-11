import { cn } from "@/lib/utils";

const PALETTE = [
  { bg: "var(--tint-blue)", fg: "var(--tint-blue-fg)" },
  { bg: "var(--tint-green)", fg: "var(--tint-green-fg)" },
  { bg: "var(--tint-purple)", fg: "var(--tint-purple-fg)" },
  { bg: "var(--tint-orange)", fg: "var(--tint-orange-fg)" },
  { bg: "var(--tint-pink)", fg: "var(--tint-pink-fg)" },
  { bg: "var(--tint-teal)", fg: "var(--tint-teal-fg)" },
] as const;

/**
 * Deterministische kleur op basis van de string-hash. Zelfde naam levert
 * altijd dezelfde kleur, zodat klanten herkenbaar zijn over schermen heen.
 */
function pickColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const c = pickColor(name || "?");
  const dim =
    size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-xs";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide select-none",
        dim,
        className
      )}
      style={{ background: c.bg, color: c.fg }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
