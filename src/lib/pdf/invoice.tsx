import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Factuur, Klant, Project, Tijdsregistratie } from "@/lib/types";
import type { Profile } from "@/lib/auth";
import { money, numFixed, nullableNumber } from "@/lib/format";

function fmtPdfDate(value: unknown, pattern = "dd-MM-yyyy"): string {
  if (!value || typeof value !== "string") return "—";
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? format(d, pattern, { locale: nl }) : "—";
}

const FONT = "Helvetica";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 50,
    paddingBottom: 90,
    fontSize: 10,
    fontFamily: FONT,
    color: "#1f2937",
  },

  // Logo header
  brandHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  brandWordmark: {
    fontSize: 18,
    fontWeight: 700,
  },
  brandWebsite: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  logoImg: { maxWidth: 180, maxHeight: 60, objectFit: "contain" },

  // Addresses
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 16,
  },
  addressLeft: { flex: 1, fontSize: 10, lineHeight: 1.4 },
  addressRight: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
    padding: 8,
    borderWidth: 1,
    borderColor: "#9ca3af",
  },
  addressBold: { fontWeight: 700 },

  // Metadata table
  meta: { marginBottom: 22 },
  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaLabel: { width: 130, fontSize: 10 },
  metaColon: { width: 10, fontSize: 10 },
  metaValue: { flex: 1, fontSize: 10 },

  // Items table
  itemsTable: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#9ca3af",
    marginBottom: 18,
  },
  itemsHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#9ca3af",
    backgroundColor: "#f9fafb",
  },
  itemsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#9ca3af",
    minHeight: 22,
  },
  itemsCell: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 10,
  },
  itemsCellTh: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9,
    fontWeight: 700,
  },
  colAant: { width: 50, borderRightWidth: 1, borderColor: "#9ca3af" },
  colOmschr: { flex: 1, borderRightWidth: 1, borderColor: "#9ca3af" },
  colPrijs: { width: 78, borderRightWidth: 1, borderColor: "#9ca3af", textAlign: "right" },
  colTotaal: { width: 90, textAlign: "right" },

  // Totals block (right-aligned bordered table)
  totalsWrapper: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  totalsTable: {
    width: 280,
  },
  totalsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 22,
  },
  totalsLabel: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 10,
  },
  totalsValue: {
    width: 100,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 10,
    textAlign: "right",
    borderWidth: 1,
    borderColor: "#9ca3af",
  },
  totalsValueBold: {
    fontWeight: 700,
  },
  totalsLabelBold: {
    fontWeight: 700,
  },

  // Payment terms
  payment: {
    fontSize: 9,
    fontStyle: "italic",
    color: "#374151",
    lineHeight: 1.5,
    marginBottom: 6,
  },

  // Notities
  notes: {
    marginTop: 10,
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    paddingTop: 8,
  },
  footerAccent: {
    height: 1.5,
    width: 60,
    marginBottom: 6,
  },
  footerCols: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#6b7280",
    lineHeight: 1.45,
  },
  footerCol: { flex: 1 },
  footerColRight: { flex: 1, textAlign: "right" },

  // Bijlage (urendetail) page-specific
  bijlageHeader: { marginBottom: 16 },
  bijlageTitle: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  bijlageSub: { fontSize: 9, color: "#6b7280" },
  bijlageTable: { marginTop: 10 },
  bijlageRow: {
    flexDirection: "row",
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
    paddingVertical: 5,
  },
  bijlageHeaderRow: {
    borderBottomColor: "#1f2937",
    borderBottomWidth: 1,
  },
  bijlageTh: {
    fontSize: 9,
    fontWeight: 700,
    color: "#27272a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bijlageTd: { fontSize: 9 },
  bijlageColDate: { width: 70 },
  bijlageColProject: { flex: 2 },
  bijlageColOmschr: { flex: 3 },
  bijlageColUren: { width: 50, textAlign: "right" },
  bijlageTotal: {
    flexDirection: "row",
    marginTop: 10,
    justifyContent: "flex-end",
  },
  bijlageTotalCell: { fontSize: 10, fontWeight: 700 },
});

function BrandHeader({ profile, accentKleur }: { profile: Profile; accentKleur: string }) {
  return (
    <View style={styles.brandHeader}>
      {profile.factuur_logo_data ? (
        <Image src={profile.factuur_logo_data} style={styles.logoImg} />
      ) : (
        <Text style={[styles.brandWordmark, { color: accentKleur }]}>
          {profile.factuur_naam || profile.naam}
        </Text>
      )}
      {profile.factuur_website ? (
        <Text style={styles.brandWebsite}>{profile.factuur_website}</Text>
      ) : null}
    </View>
  );
}

function Addresses({ klant, profile }: { klant: Klant; profile: Profile }) {
  return (
    <View style={styles.addressRow}>
      <View style={styles.addressLeft}>
        <Text style={styles.addressBold}>{klant.naam}</Text>
        {klant.factuur_taa ? <Text>t.a.v. {klant.factuur_taa}</Text> : null}
        {klant.factuur_adres ? <Text>{klant.factuur_adres}</Text> : null}
        {klant.factuur_postcode || klant.factuur_plaats ? (
          <Text>
            {klant.factuur_postcode}
            {klant.factuur_postcode && klant.factuur_plaats ? " " : ""}
            {klant.factuur_plaats}
          </Text>
        ) : null}
      </View>
      <View style={styles.addressRight}>
        <Text style={styles.addressBold}>
          {profile.factuur_naam || profile.naam}
        </Text>
        {profile.factuur_adres ? <Text>{profile.factuur_adres}</Text> : null}
        {profile.factuur_postcode || profile.factuur_plaats ? (
          <Text>
            {profile.factuur_postcode}
            {profile.factuur_postcode && profile.factuur_plaats ? " " : ""}
            {profile.factuur_plaats}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MetaBlock({ factuur, klant }: { factuur: Factuur; klant: Klant }) {
  const rows: { label: string; value: string }[] = [
    { label: "Factuurnummer", value: factuur.factuurnummer || "—" },
    { label: "Factuurdatum", value: fmtPdfDate(factuur.factuurdatum) },
    { label: "Vervaldatum", value: fmtPdfDate(factuur.vervaldatum) },
  ];
  if (factuur.uw_ordernummer) {
    rows.push({ label: "Uw ordernummer", value: factuur.uw_ordernummer });
  }
  if (klant.debiteurnummer) {
    rows.push({ label: "Debiteurnummer", value: klant.debiteurnummer });
  }
  return (
    <View style={styles.meta}>
      {rows.map((r) => (
        <View key={r.label} style={styles.metaRow}>
          <Text style={styles.metaLabel}>{r.label}</Text>
          <Text style={styles.metaColon}>:</Text>
          <Text style={styles.metaValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ItemsTable({ regels }: { regels: Factuur["regels"] }) {
  const safe = Array.isArray(regels) ? regels : [];
  return (
    <View style={styles.itemsTable}>
      <View style={styles.itemsHeaderRow}>
        <View style={[styles.colAant]}>
          <Text style={styles.itemsCellTh}>Aantal</Text>
        </View>
        <View style={[styles.colOmschr]}>
          <Text style={styles.itemsCellTh}>Omschrijving</Text>
        </View>
        <View style={[styles.colPrijs]}>
          <Text style={styles.itemsCellTh}>Prijs</Text>
        </View>
        <View style={[styles.colTotaal]}>
          <Text style={styles.itemsCellTh}>Totaal</Text>
        </View>
      </View>
      {safe.map((r, i) => (
        <View key={i} style={styles.itemsRow}>
          <View style={[styles.colAant]}>
            <Text style={styles.itemsCell}>
              {numFixed(r.aantal_uren, 2).replace(".", ",")}
            </Text>
          </View>
          <View style={[styles.colOmschr]}>
            <Text style={styles.itemsCell}>{r.omschrijving || "—"}</Text>
          </View>
          <View style={[styles.colPrijs]}>
            <Text style={styles.itemsCell}>{money(r.uurtarief)}</Text>
          </View>
          <View style={[styles.colTotaal]}>
            <Text style={styles.itemsCell}>{money(r.bedrag)}</Text>
          </View>
        </View>
      ))}
      {/* Lege rij voor visuele rust onder de inhoud */}
      {safe.length < 3 ? (
        <View style={styles.itemsRow}>
          <View style={[styles.colAant]}><Text style={styles.itemsCell}> </Text></View>
          <View style={[styles.colOmschr]}><Text style={styles.itemsCell}> </Text></View>
          <View style={[styles.colPrijs]}><Text style={styles.itemsCell}> </Text></View>
          <View style={[styles.colTotaal]}><Text style={styles.itemsCell}> </Text></View>
        </View>
      ) : null}
    </View>
  );
}

function TotalsBlock({ factuur }: { factuur: Factuur }) {
  const btwPct = nullableNumber(factuur.btw_percentage) ?? 0;
  return (
    <View style={styles.totalsWrapper}>
      <View style={styles.totalsTable}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Te voldoen excl. BTW</Text>
          <Text style={styles.totalsValue}>{money(factuur.totaal_excl_btw)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>{btwPct}% BTW</Text>
          <Text style={styles.totalsValue}>{money(factuur.btw_bedrag)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={[styles.totalsLabel, styles.totalsLabelBold]}>
            Totaal te betalen:
          </Text>
          <Text style={[styles.totalsValue, styles.totalsValueBold]}>
            {money(factuur.totaal_incl_btw)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PaymentTerms({
  factuur,
  klant,
  profile,
}: {
  factuur: Factuur;
  klant: Klant;
  profile: Profile;
}) {
  const dagen = nullableNumber(klant.betaaltermijn_dagen) ?? 30;
  const iban = profile.iban ? profile.iban : "(IBAN ontbreekt in profiel)";
  return (
    <View>
      <Text style={styles.payment}>
        Betaling binnen {dagen} dagen op rekeningnummer {iban}. Te betalen in Euro.
      </Text>
      {factuur.betalingskenmerk ? (
        <Text style={styles.payment}>
          Bij betaling s.v.p. het volgende betalingskenmerk gebruiken:{" "}
          {factuur.betalingskenmerk}.
        </Text>
      ) : null}
      {factuur.notities ? (
        <Text style={styles.notes}>{factuur.notities}</Text>
      ) : null}
    </View>
  );
}

function Footer({ profile, accentKleur }: { profile: Profile; accentKleur: string }) {
  const left: string[] = [];
  if (profile.factuur_naam) left.push(profile.factuur_naam);
  if (profile.factuur_telefoon) left.push(`T ${profile.factuur_telefoon}`);
  if (profile.factuur_voettekst) left.push(profile.factuur_voettekst);

  const right: string[] = [];
  if (profile.kvk_nummer) right.push(`KVK ${profile.kvk_nummer}`);
  if (profile.btw_nummer) right.push(`BTW ${profile.btw_nummer}`);
  if (profile.iban) right.push(`IBAN ${profile.iban}`);

  if (left.length === 0 && right.length === 0) return null;

  return (
    <View style={styles.footer} fixed>
      <View
        style={[styles.footerAccent, { backgroundColor: accentKleur, alignSelf: "center" }]}
      />
      <View style={styles.footerCols}>
        <View style={styles.footerCol}>
          {left.map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </View>
        <View style={styles.footerColRight}>
          {right.map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export function InvoiceDocument({
  factuur,
  klant,
  profile,
  accentKleur,
  bijlage,
}: {
  factuur: Factuur;
  klant: Klant;
  profile: Profile;
  accentKleur: string;
  /** Wanneer aanwezig en factuur.include_uren_bijlage true is, voegt extra pagina toe met uren-detail. */
  bijlage?: { tijden: Tijdsregistratie[]; projecten: Project[] };
}) {
  const showBijlage = Boolean(
    factuur.include_uren_bijlage && bijlage && bijlage.tijden.length > 0
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <BrandHeader profile={profile} accentKleur={accentKleur} />
        <Addresses klant={klant} profile={profile} />
        <MetaBlock factuur={factuur} klant={klant} />
        <ItemsTable regels={factuur.regels} />
        <TotalsBlock factuur={factuur} />
        <PaymentTerms factuur={factuur} klant={klant} profile={profile} />
        <Footer profile={profile} accentKleur={accentKleur} />
      </Page>

      {showBijlage && bijlage ? (
        <BijlagePage
          tijden={bijlage.tijden}
          projecten={bijlage.projecten}
          factuur={factuur}
          klant={klant}
          profile={profile}
          accentKleur={accentKleur}
        />
      ) : null}
    </Document>
  );
}

function BijlagePage({
  tijden,
  projecten,
  factuur,
  klant,
  profile,
  accentKleur,
}: {
  tijden: Tijdsregistratie[];
  projecten: Project[];
  factuur: Factuur;
  klant: Klant;
  profile: Profile;
  accentKleur: string;
}) {
  const projectById = new Map(projecten.map((p) => [p.id, p]));
  const sorted = [...tijden].sort((a, b) =>
    a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.created_at.localeCompare(b.created_at)
  );
  const totaalUren = sorted.reduce((s, t) => s + (Number(t.uren) || 0), 0);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.bijlageHeader}>
        <Text style={styles.bijlageTitle}>Urendetail</Text>
        <Text style={styles.bijlageSub}>
          Bijlage bij factuur {factuur.factuurnummer} — {klant.naam} —{" "}
          {fmtPdfDate(factuur.periode_start, "d MMM")} t/m{" "}
          {fmtPdfDate(factuur.periode_eind, "d MMM yyyy")}
        </Text>
      </View>

      <View style={styles.bijlageTable}>
        <View style={[styles.bijlageRow, styles.bijlageHeaderRow]}>
          <Text style={[styles.bijlageTh, styles.bijlageColDate]}>Datum</Text>
          <Text style={[styles.bijlageTh, styles.bijlageColProject]}>Project</Text>
          <Text style={[styles.bijlageTh, styles.bijlageColOmschr]}>Omschrijving</Text>
          <Text style={[styles.bijlageTh, styles.bijlageColUren]}>Uren</Text>
        </View>
        {sorted.map((t) => {
          const project = projectById.get(t.project_id);
          return (
            <View key={t.id} style={styles.bijlageRow} wrap={false}>
              <Text style={[styles.bijlageTd, styles.bijlageColDate]}>
                {fmtPdfDate(t.datum, "d MMM yyyy")}
              </Text>
              <Text style={[styles.bijlageTd, styles.bijlageColProject]}>
                {project?.naam ?? "—"}
              </Text>
              <Text style={[styles.bijlageTd, styles.bijlageColOmschr]}>
                {t.omschrijving || "—"}
              </Text>
              <Text style={[styles.bijlageTd, styles.bijlageColUren]}>
                {numFixed(t.uren).replace(".", ",")}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.bijlageTotal}>
        <Text style={[styles.bijlageTotalCell, { color: accentKleur }]}>
          Totaal: {totaalUren.toFixed(2).replace(".", ",")} uur
        </Text>
      </View>

      <Footer profile={profile} accentKleur={accentKleur} />
    </Page>
  );
}
