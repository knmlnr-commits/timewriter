"use client";

export function BrandStyle({ accent }: { accent: string }) {
  return (
    <style>{`:root { --brand: ${accent}; --brand-soft: color-mix(in srgb, ${accent} 12%, transparent); --brand-ring: color-mix(in srgb, ${accent} 40%, transparent); }`}</style>
  );
}
