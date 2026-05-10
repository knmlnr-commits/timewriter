import { beforeEach, describe, expect, it, vi } from "vitest";
import { installKvMock } from "./setup-kv-mock";

/**
 * Race test: simulates the marktradar pattern's replacement for the Postgres
 * SECURITY DEFINER function the prompt called for. We exercise nextFactuurnummer
 * in parallel and require that:
 *  - every call returns a unique invoice number
 *  - sequence is contiguous (1, 2, 3, ...)
 *  - the user profile's `volgend_factuurnummer` ends one past the last issued
 */

describe("nextFactuurnummer (atomic via KV INCR)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("issues sequential, unique numbers under concurrency", async () => {
    const { kv } = installKvMock("concurrent");
    const { KEYS } = await import("@/lib/keys");

    // seed a user record
    const uid = "user-1";
    await kv.set(KEYS.user(uid), {
      id: uid,
      email: "test@example.com",
      password_salt: "x",
      password_hash: "x",
      profile: {
        naam: "Test",
        accent_kleur: "#E8732A",
        standaard_uurtarief: null,
        factuur_naam: "Test",
        factuur_adres: "",
        factuur_postcode: "",
        factuur_plaats: "",
        kvk_nummer: "",
        btw_nummer: "",
        iban: "",
        factuur_voettekst: "",
        volgend_factuurnummer: 1,
        factuurnummer_prefix: "2026-",
        voltooid: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const { nextFactuurnummer } = await import("@/lib/repo/facturen");

    const N = 50;
    const results = await Promise.all(Array.from({ length: N }, () => nextFactuurnummer(uid)));

    expect(new Set(results).size).toBe(N);
    const numericPart = results
      .map((s) => Number(s.replace("2026-", "")))
      .sort((a, b) => a - b);
    expect(numericPart).toEqual(Array.from({ length: N }, (_, i) => i + 1));

    const user = (await kv.get<{ profile: { volgend_factuurnummer: number } }>(KEYS.user(uid)))!;
    expect(user.profile.volgend_factuurnummer).toBe(N + 1);
  });

  it("respects a user-configured starting number", async () => {
    const { kv } = installKvMock("concurrent");
    const { KEYS } = await import("@/lib/keys");
    const uid = "user-2";
    await kv.set(KEYS.user(uid), {
      id: uid,
      email: "x@example.com",
      password_salt: "x",
      password_hash: "x",
      profile: {
        naam: "x",
        accent_kleur: "#E8732A",
        standaard_uurtarief: null,
        factuur_naam: "x",
        factuur_adres: "",
        factuur_postcode: "",
        factuur_plaats: "",
        kvk_nummer: "",
        btw_nummer: "",
        iban: "",
        factuur_voettekst: "",
        volgend_factuurnummer: 42,
        factuurnummer_prefix: "",
        voltooid: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const { nextFactuurnummer } = await import("@/lib/repo/facturen");
    const first = await nextFactuurnummer(uid);
    expect(Number(first)).toBe(42);
    const second = await nextFactuurnummer(uid);
    expect(Number(second)).toBe(43);
  });
});
