/**
 * Accepts decimal ("1.5" / "1,5") or HH:mm ("1:30") and returns hours as a
 * decimal rounded to 2 places. Throws on invalid input.
 */
export function parseUren(input: string | number): number {
  if (typeof input === "number") return roundHours(input);
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Uren is verplicht.");
  if (trimmed.includes(":")) {
    const [h, m] = trimmed.split(":");
    const hours = Number(h);
    const minutes = Number(m);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes >= 60) {
      throw new Error("Ongeldige tijdnotatie. Gebruik bv. 1:30 of 1,5.");
    }
    return roundHours(hours + minutes / 60);
  }
  const normalised = trimmed.replace(",", ".");
  const v = Number(normalised);
  if (!Number.isFinite(v)) throw new Error("Ongeldige urennotatie.");
  return roundHours(v);
}

export function roundHours(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatUren(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function formatHM(n: number): string {
  const hours = Math.floor(n);
  const minutes = Math.round((n - hours) * 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}
