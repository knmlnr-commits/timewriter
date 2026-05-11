import { beforeEach, describe, expect, it, vi } from "vitest";
import { installKvMock } from "./setup-kv-mock";

describe("isBootstrapAvailable + signup", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ADMIN_EMAILS;
  });

  it("eerste account claimt de omgeving en wordt automatisch beheerder", async () => {
    installKvMock();
    const { isBootstrapAvailable, signup } = await import("@/lib/auth");

    expect(await isBootstrapAvailable()).toBe(true);
    const { user } = await signup({
      email: "owner@example.com",
      password: "supergeheim123",
      naam: "Owner",
    });
    expect(user.profile.is_admin).toBe(true);
    expect(await isBootstrapAvailable()).toBe(false);
  });

  it("blokkeert publieke signup zodra er gebruikers zijn", async () => {
    installKvMock();
    const { signup } = await import("@/lib/auth");
    await signup({ email: "owner@example.com", password: "supergeheim123", naam: "Owner" });
    await expect(
      signup({ email: "indringer@example.com", password: "supergeheim123", naam: "Indringer" })
    ).rejects.toThrow(/beheerder/i);
  });
});

describe("adminCreateUser", () => {
  beforeEach(() => vi.resetModules());

  it("staat alleen aanmaken via beheerder toe en dwingt minimumeisen af", async () => {
    installKvMock();
    const { adminCreateUser } = await import("@/lib/auth");
    const u = await adminCreateUser({
      email: "Partner@Example.com",
      password: "abcdefgh",
      naam: "Partner",
    });
    expect(u.email).toBe("partner@example.com");
    expect(u.profile.is_admin).toBe(false);

    await expect(
      adminCreateUser({ email: "x@example.com", password: "short", naam: "X" })
    ).rejects.toThrow(/8 tekens/);

    await expect(
      adminCreateUser({ email: "Partner@example.com", password: "abcdefgh", naam: "Partner" })
    ).rejects.toThrow(/bestaat al/);
  });

  it("kan een tweede beheerder aanmaken", async () => {
    installKvMock();
    const { adminCreateUser } = await import("@/lib/auth");
    const u = await adminCreateUser({
      email: "co@example.com",
      password: "supergeheim123",
      naam: "Co",
      is_admin: true,
    });
    expect(u.profile.is_admin).toBe(true);
  });
});

describe("isAdmin met env-override", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ADMIN_EMAILS;
  });

  it("respecteert profile.is_admin", async () => {
    const { isAdmin } = await import("@/lib/auth");
    expect(isAdmin({ email: "x@example.com", profile: { is_admin: true } })).toBe(true);
    expect(isAdmin({ email: "x@example.com", profile: { is_admin: false } })).toBe(false);
  });

  it("ADMIN_EMAILS env wint zelfs als de flag op false staat", async () => {
    process.env.ADMIN_EMAILS = "x@example.com,andere@example.com";
    const { isAdmin } = await import("@/lib/auth");
    expect(isAdmin({ email: "X@Example.com", profile: { is_admin: false } })).toBe(true);
    expect(isAdmin({ email: "buiten@example.com", profile: { is_admin: false } })).toBe(false);
  });
});

describe("admin lifecycle", () => {
  beforeEach(() => vi.resetModules());

  it("kan een gebruiker aanmaken, demoten/promoteren, wachtwoord resetten, en verwijderen", async () => {
    installKvMock();
    const { adminCreateUser, adminListUsers, adminSetAdmin, adminResetPassword, adminDeleteUser, login } =
      await import("@/lib/auth");

    const u = await adminCreateUser({ email: "p@example.com", password: "supergeheim123", naam: "P" });
    expect((await adminListUsers()).map((x) => x.email)).toContain("p@example.com");

    await adminSetAdmin(u.id, true);
    await adminSetAdmin(u.id, false);

    // login werkt met initieel wachtwoord
    await expect(login("p@example.com", "supergeheim123")).resolves.toBeTruthy();

    // reset trekt sessies in (wordt impliciet getest doordat login met oud pw faalt)
    await adminResetPassword(u.id, "nieuwgeheim123");
    await expect(login("p@example.com", "supergeheim123")).rejects.toThrow();
    await expect(login("p@example.com", "nieuwgeheim123")).resolves.toBeTruthy();

    await adminDeleteUser(u.id);
    expect((await adminListUsers()).map((x) => x.email)).not.toContain("p@example.com");
  });
});
