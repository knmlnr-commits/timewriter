import { describe, expect, it } from "vitest";
import { parseBulkUren } from "@/lib/parse-bulk-uren";

const VIER_REGELS_VOORBEELD = `Datum
Dag
Werkzaamheden
Uren
1 mei
vrij
AI beleidsdocument MT (v1 + Careyn-aanvulling)
4,5
1 mei
vrij
IDEA-013 eLearning specs outline v1 & v2
2,0
2 mei
zat
Glossary v2 setup met changelog (tweetalig NL/EN)
1,0`;

describe("parseBulkUren - vier-regel formaat", () => {
  it("herkent de header en parseert alle rijen", () => {
    const r = parseBulkUren(VIER_REGELS_VOORBEELD, 2026);
    expect(r.format).toBe("vier-regels");
    expect(r.headerDetected).toBe(true);
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0].datum).toBe("2026-05-01");
    expect(r.rows[0].uren).toBe(4.5);
    expect(r.rows[0].omschrijving).toMatch(/AI beleidsdocument/);
    expect(r.rows[0].error).toBeNull();
    expect(r.rows[2].uren).toBe(1);
  });

  it("ondersteunt punt-decimalen en HH:mm", () => {
    const txt = `1 mei
vrij
Test
1.5
2 mei
zat
Test 2
0:45`;
    const r = parseBulkUren(txt, 2026);
    expect(r.rows[0].uren).toBe(1.5);
    expect(r.rows[1].uren).toBe(0.75);
  });

  it("markeert onparsbare datums met een error", () => {
    const txt = `xxnotadate
vrij
Test
1,0`;
    const r = parseBulkUren(txt, 2026);
    expect(r.rows[0].error).toMatch(/Datum/);
    expect(r.rows[0].datum).toBeNull();
  });

  it("markeert onmogelijke uren", () => {
    const txt = `1 mei
vrij
Test
25`;
    const r = parseBulkUren(txt, 2026);
    expect(r.rows[0].error).toMatch(/tussen 0 en 24/);
  });

  it("rond resterende fragmenten af (geen rij voor incomplete kolom)", () => {
    const txt = `1 mei
vrij
Test
1,0
2 mei
zat`;
    const r = parseBulkUren(txt, 2026);
    expect(r.rows).toHaveLength(1);
  });
});

describe("parseBulkUren - TSV formaat", () => {
  it("parseert vier-koloms TSV", () => {
    const txt = "Datum\tDag\tWerkzaamheden\tUren\n1 mei\tvrij\tIets gedaan\t1,5\n2 mei\tzat\tNog iets\t0,75";
    const r = parseBulkUren(txt, 2026);
    expect(r.format).toBe("tsv");
    expect(r.headerDetected).toBe(true);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].datum).toBe("2026-05-01");
    expect(r.rows[0].uren).toBe(1.5);
    expect(r.rows[1].datum).toBe("2026-05-02");
  });

  it("parseert drie-koloms TSV (zonder dag-kolom)", () => {
    const txt = "1 mei\tIets\t1,5\n2 mei\tNog iets\t2";
    const r = parseBulkUren(txt, 2026);
    expect(r.format).toBe("tsv");
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].datum).toBe("2026-05-01");
    expect(r.rows[0].uren).toBe(1.5);
    expect(r.rows[1].uren).toBe(2);
  });

  it("ondersteunt diverse datum-formaten", () => {
    const txt = [
      "1-5\tx\tA\t1",
      "01/05/2026\tx\tB\t1",
      "2026-05-03\tx\tC\t1",
      "4 mei 2026\tx\tD\t1",
      "5 mei '26\tx\tE\t1",
      "1 sept\tx\tF\t1",
    ].join("\n");
    const r = parseBulkUren(txt, 2026);
    expect(r.rows.map((x) => x.datum)).toEqual([
      "2026-05-01",
      "2026-05-01",
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
      "2026-09-01",
    ]);
  });
});

describe("parseBulkUren - lege input", () => {
  it("geeft lege resultaten zonder te crashen", () => {
    expect(parseBulkUren("", 2026).format).toBe("leeg");
    expect(parseBulkUren("\n\n   \n", 2026).format).toBe("leeg");
  });
});
