import { beforeEach, describe, expect, it, vi } from "vitest";
import { installKvMock } from "./setup-kv-mock";

describe("isSignupAllowed", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.SIGNUP_ALLOWLIST;
  });

  it("staat het allereerste account toe als bootstrap", async () => {
    installKvMock();
    const { isSignupAllowed } = await import("@/lib/auth");
    const r = await isSignupAllowed("eerste@example.com");
    expect(r.allowed).toBe(true);
    expect(r.bootstrap).toBe(true);
  });

  it("blokkeert standaard nieuwe accounts zodra er gebruikers zijn", async () => {
    const { kv } = installKvMock();
    const { KEYS } = await import("@/lib/keys");
    await kv.sadd(KEYS.usersIndex(), "uid-bestaande");
    const { isSignupAllowed } = await import("@/lib/auth");
    const r = await isSignupAllowed("indringer@example.com");
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/uitgeschakeld/i);
  });

  it("staat alleen e-mails op de allowlist toe wanneer die is gezet", async () => {
    const { kv } = installKvMock();
    const { KEYS } = await import("@/lib/keys");
    await kv.sadd(KEYS.usersIndex(), "uid-bestaande");
    process.env.SIGNUP_ALLOWLIST = "partner@example.com, andere@example.com";

    const { isSignupAllowed } = await import("@/lib/auth");
    expect((await isSignupAllowed("partner@example.com")).allowed).toBe(true);
    expect((await isSignupAllowed("PARTNER@example.com")).allowed).toBe(true);
    expect((await isSignupAllowed("buitenstaander@example.com")).allowed).toBe(false);
  });

  it("weigert wanneer KV niet geconfigureerd is", async () => {
    vi.doMock("@/lib/kv", () => ({
      getKv: () => ({ driver: "absent", smembers: async () => [] }),
      isKvConfigured: () => false,
    }));
    vi.doMock("server-only", () => ({}));
    const { isSignupAllowed } = await import("@/lib/auth");
    const r = await isSignupAllowed("test@example.com");
    expect(r.allowed).toBe(false);
  });
});

describe("signup gating", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.SIGNUP_ALLOWLIST;
  });

  it("staat eerste account toe, blokkeert tweede zonder allowlist", async () => {
    installKvMock();
    const { signup } = await import("@/lib/auth");

    await signup({ email: "owner@example.com", password: "supergeheim123", naam: "Owner" });
    await expect(
      signup({ email: "indringer@example.com", password: "supergeheim123", naam: "Indringer" })
    ).rejects.toThrow(/uitgeschakeld/i);
  });
});
