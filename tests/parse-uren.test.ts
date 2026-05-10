import { describe, expect, it } from "vitest";
import { parseUren, formatUren } from "@/lib/parse-uren";

describe("parseUren", () => {
  it("accepts decimal with dot", () => {
    expect(parseUren("1.5")).toBe(1.5);
  });
  it("accepts decimal with comma", () => {
    expect(parseUren("1,5")).toBe(1.5);
  });
  it("accepts HH:mm", () => {
    expect(parseUren("1:30")).toBe(1.5);
    expect(parseUren("0:15")).toBe(0.25);
    expect(parseUren("8:00")).toBe(8);
  });
  it("rounds to 2 decimals", () => {
    expect(parseUren("1:20")).toBe(1.33);
  });
  it("rejects invalid", () => {
    expect(() => parseUren("")).toThrow();
    expect(() => parseUren("abc")).toThrow();
    expect(() => parseUren("1:99")).toThrow();
  });
});

describe("formatUren", () => {
  it("formats with comma", () => {
    expect(formatUren(1.5)).toBe("1,50");
    expect(formatUren(8)).toBe("8,00");
  });
});
