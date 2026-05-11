import { beforeEach, describe, expect, it, vi } from "vitest";
import { installKvMock } from "./setup-kv-mock";

const baseKlant = {
  factuur_email: "",
  factuur_adres: "",
  factuur_postcode: "",
  factuur_plaats: "",
  standaard_uurtarief: null as number | null,
  btw_percentage: 21,
  betaaltermijn_dagen: 30,
  notities: "",
  archief: false,
};

const baseProject = {
  omschrijving: "",
  uurtarief: null as number | null,
  kleur: "#E8732A",
  factureerbaar: true,
  archief: false,
};

describe("klanten: uniciteit", () => {
  beforeEach(() => vi.resetModules());

  it("weigert tweede klant met dezelfde naam (case- en spatie-insensitief)", async () => {
    installKvMock();
    const { createKlant } = await import("@/lib/repo/klanten");

    await createKlant("u1", { ...baseKlant, naam: "GeriCall" });
    await expect(createKlant("u1", { ...baseKlant, naam: "GeriCall" })).rejects.toThrow(/GeriCall/);
    await expect(createKlant("u1", { ...baseKlant, naam: "gericall" })).rejects.toThrow(/GeriCall/);
    await expect(createKlant("u1", { ...baseKlant, naam: "  GeriCall  " })).rejects.toThrow(/GeriCall/);
  });

  it("staat dezelfde naam wel toe binnen een andere gebruiker", async () => {
    installKvMock();
    const { createKlant } = await import("@/lib/repo/klanten");
    await createKlant("u1", { ...baseKlant, naam: "GeriCall" });
    await expect(createKlant("u2", { ...baseKlant, naam: "GeriCall" })).resolves.toBeTruthy();
  });

  it("blokkeert rename naar bestaande naam, staat eigen naam wel toe", async () => {
    installKvMock();
    const { createKlant, updateKlant } = await import("@/lib/repo/klanten");
    const a = await createKlant("u1", { ...baseKlant, naam: "GeriCall" });
    const b = await createKlant("u1", { ...baseKlant, naam: "AndereKlant" });
    await expect(updateKlant("u1", b.id, { naam: "GeriCall" })).rejects.toThrow();
    await expect(updateKlant("u1", a.id, { naam: "GeriCall" })).resolves.toBeTruthy();
  });
});

describe("projecten: uniciteit per klant", () => {
  beforeEach(() => vi.resetModules());

  it("weigert dubbele project-naam binnen dezelfde klant", async () => {
    installKvMock();
    const { createProject } = await import("@/lib/repo/projecten");
    await createProject("u1", { ...baseProject, naam: "Website", klant_id: "klant-1" });
    await expect(
      createProject("u1", { ...baseProject, naam: "Website", klant_id: "klant-1" })
    ).rejects.toThrow();
  });

  it("staat dezelfde naam toe voor verschillende klanten", async () => {
    installKvMock();
    const { createProject } = await import("@/lib/repo/projecten");
    await createProject("u1", { ...baseProject, naam: "Website", klant_id: "klant-1" });
    await expect(
      createProject("u1", { ...baseProject, naam: "Website", klant_id: "klant-2" })
    ).resolves.toBeTruthy();
  });

  it("weigert dubbele persoonlijke project-naam", async () => {
    installKvMock();
    const { createProject } = await import("@/lib/repo/projecten");
    await createProject("u1", { ...baseProject, naam: "Studie", klant_id: null });
    await expect(
      createProject("u1", { ...baseProject, naam: "studie", klant_id: null })
    ).rejects.toThrow();
  });
});
