/**
 * Tolerante formatters voor weergave. Voorkomt dat een onverwacht
 * `null` of `NaN` (bv. uit historische data of een corrupte JSON-record)
 * meteen een TypeError oplevert bij toFixed().
 */

export function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function money(value: unknown, fallback = "—"): string {
  const n = nullableNumber(value);
  if (n === null) return fallback;
  return `€ ${n.toFixed(2)}`;
}

export function numFixed(value: unknown, fractionDigits = 2, fallback = "—"): string {
  const n = nullableNumber(value);
  if (n === null) return fallback;
  return n.toFixed(fractionDigits);
}

export function percent(value: unknown, fallback = "—"): string {
  const n = nullableNumber(value);
  if (n === null) return fallback;
  return `${n}%`;
}
