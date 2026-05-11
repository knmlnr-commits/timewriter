import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Factuur, Klant, Project, Tijdsregistratie } from "@/lib/types";
import type { Profile } from "@/lib/auth";
import { money, numFixed, nullableNumber } from "@/lib/format";

function fmtPdfDate(value: unknown, pattern = "d MMMM yyyy"): string {
  if (!value || typeof value !== "string") return "—";
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? format(d, pattern, { locale: nl }) : "—";
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#18181b" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  brand: { fontSize: 18, fontWeight: 700, color: "#E8732A", marginBottom: 6 },
  small: { fontSize: 9, color: "#52525B", lineHeight: 1.4 },
  meta: { textAlign: "right", lineHeight: 1.4 },
  metaLabel: { color: "#52525B", marginRight: 8 },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", gap: 4, marginBottom: 2 },
  block: { marginBottom: 14 },
  blockTitle: { fontSize: 9, color: "#52525B", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  table: { marginTop: 20, marginBottom: 12 },
  tr: { flexDirection: "row", borderBottomColor: "#E4E4E7", borderBottomWidth: 1, paddingVertical: 6 },
  thead: { borderBottomColor: "#18181b", borderBottomWidth: 1 },
  th: { fontWeight: 700, fontSize: 9, color: "#27272a", textTransform: "uppercase", letterSpacing: 0.5 },
  td: { fontSize: 10 },
  colDesc: { flex: 4 },
  colNum: { flex: 1, textAlign: "right" },
  totals: { alignItems: "flex-end", marginTop: 14 },
  totalRow: { flexDirection: "row", gap: 24, marginBottom: 3 },
  totalLabel: { width: 120, textAlign: "right", color: "#52525B" },
  totalValue: { width: 90, textAlign: "right" },
  totalFinal: { fontWeight: 700, color: "#E8732A", fontSize: 12 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 9, color: "#71717A", textAlign: "center", borderTopWidth: 1, borderTopColor: "#E4E4E7", paddingTop: 6 },
});

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
  /** Wanneer aanwezig en factuur.include_uren_bijlage true is, wordt een extra pagina met uren-detail toegevoegd. */
  bijlage?: { tijden: Tijdsregistratie[]; projecten: Project[] };
}) {
  const brandStyle = { color: accentKleur };
  const showBijlage = Boolean(factuur.include_uren_bijlage && bijlage && bijlage.tijden.length > 0);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, brandStyle]}>{profile.factuur_naam || profile.naam}</Text>
            <Text style={styles.small}>{profile.factuur_adres}</Text>
            <Text style={styles.small}>
              {profile.factuur_postcode} {profile.factuur_plaats}
            </Text>
            {profile.kvk_nummer ? <Text style={styles.small}>KVK: {profile.kvk_nummer}</Text> : null}
            {profile.btw_nummer ? <Text style={styles.small}>BTW: {profile.btw_nummer}</Text> : null}
            {profile.iban ? <Text style={styles.small}>IBAN: {profile.iban}</Text> : null}
          </View>
          <View style={styles.meta}>
            <Text style={[styles.brand, brandStyle]}>Factuur</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Nummer</Text>
              <Text>{factuur.factuurnummer}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Datum</Text>
              <Text>{fmtPdfDate(factuur.factuurdatum)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Vervaldatum</Text>
              <Text>{fmtPdfDate(factuur.vervaldatum)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Periode</Text>
              <Text>
                {fmtPdfDate(factuur.periode_start, "d MMM")} -{" "}
                {fmtPdfDate(factuur.periode_eind, "d MMM yyyy")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Aan</Text>
          <Text>{klant.naam}</Text>
          {klant.factuur_adres ? <Text style={styles.small}>{klant.factuur_adres}</Text> : null}
          {klant.factuur_postcode || klant.factuur_plaats ? (
            <Text style={styles.small}>{klant.factuur_postcode} {klant.factuur_plaats}</Text>
          ) : null}
          {klant.factuur_email ? <Text style={styles.small}>{klant.factuur_email}</Text> : null}
        </View>

        <View style={styles.table}>
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, styles.colDesc]}>Omschrijving</Text>
            <Text style={[styles.th, styles.colNum]}>Uren</Text>
            <Text style={[styles.th, styles.colNum]}>Tarief</Text>
            <Text style={[styles.th, styles.colNum]}>Bedrag</Text>
          </View>
          {(Array.isArray(factuur.regels) ? factuur.regels : []).map((r, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.colDesc]}>{r.omschrijving || "—"}</Text>
              <Text style={[styles.td, styles.colNum]}>{numFixed(r.aantal_uren)}</Text>
              <Text style={[styles.td, styles.colNum]}>{money(r.uurtarief)}</Text>
              <Text style={[styles.td, styles.colNum]}>{money(r.bedrag)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotaal</Text>
            <Text style={styles.totalValue}>{money(factuur.totaal_excl_btw)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              BTW {nullableNumber(factuur.btw_percentage) ?? 0}%
            </Text>
            <Text style={styles.totalValue}>{money(factuur.btw_bedrag)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.totalFinal, brandStyle]}>Totaal</Text>
            <Text style={[styles.totalValue, styles.totalFinal, brandStyle]}>
              {money(factuur.totaal_incl_btw)}
            </Text>
          </View>
        </View>

        {factuur.notities ? (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.blockTitle}>Notities</Text>
            <Text style={styles.small}>{factuur.notities}</Text>
          </View>
        ) : null}

        {profile.factuur_voettekst ? (
          <Text style={styles.footer} fixed>
            {profile.factuur_voettekst}
          </Text>
        ) : null}
      </Page>

      {showBijlage && bijlage ? (
        <BijlagePage
          tijden={bijlage.tijden}
          projecten={bijlage.projecten}
          factuur={factuur}
          klant={klant}
          accentKleur={accentKleur}
        />
      ) : null}
    </Document>
  );
}

const bijlageStyles = StyleSheet.create({
  intro: { fontSize: 9, color: "#52525B", marginBottom: 14 },
  table: { marginTop: 4 },
  row: { flexDirection: "row", borderBottomColor: "#E4E4E7", borderBottomWidth: 1, paddingVertical: 5 },
  header: { borderBottomColor: "#18181b", borderBottomWidth: 1 },
  th: { fontWeight: 700, fontSize: 9, color: "#27272a", textTransform: "uppercase", letterSpacing: 0.5 },
  td: { fontSize: 9 },
  colDate: { width: 70 },
  colProject: { flex: 2 },
  colOmschr: { flex: 3 },
  colUren: { width: 50, textAlign: "right" },
  totals: { flexDirection: "row", marginTop: 10, justifyContent: "flex-end" },
  totalCell: { fontSize: 10, fontWeight: 700 },
});

function BijlagePage({
  tijden,
  projecten,
  factuur,
  klant,
  accentKleur,
}: {
  tijden: Tijdsregistratie[];
  projecten: Project[];
  factuur: Factuur;
  klant: Klant;
  accentKleur: string;
}) {
  const brandStyle = { color: accentKleur };
  const projectById = new Map(projecten.map((p) => [p.id, p]));

  // Sorteer chronologisch en groepeer per dag voor leesbaarheid
  const sorted = [...tijden].sort((a, b) =>
    a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.created_at.localeCompare(b.created_at)
  );

  const totaalUren = sorted.reduce((s, t) => s + (Number(t.uren) || 0), 0);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, brandStyle]}>Urendetail</Text>
          <Text style={styles.small}>Bijlage bij factuur {factuur.factuurnummer}</Text>
          <Text style={styles.small}>{klant.naam}</Text>
        </View>
        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Periode</Text>
            <Text>
              {fmtPdfDate(factuur.periode_start, "d MMM")} -{" "}
              {fmtPdfDate(factuur.periode_eind, "d MMM yyyy")}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Regels</Text>
            <Text>{sorted.length}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Totaal</Text>
            <Text>{totaalUren.toFixed(2)} u</Text>
          </View>
        </View>
      </View>

      <Text style={bijlageStyles.intro}>
        Overzicht van alle tijdsregistraties die bij deze factuur horen.
        Sorteren is op datum; volgorde binnen een dag is op moment van invoer.
      </Text>

      <View style={bijlageStyles.table}>
        <View style={[bijlageStyles.row, bijlageStyles.header]}>
          <Text style={[bijlageStyles.th, bijlageStyles.colDate]}>Datum</Text>
          <Text style={[bijlageStyles.th, bijlageStyles.colProject]}>Project</Text>
          <Text style={[bijlageStyles.th, bijlageStyles.colOmschr]}>Omschrijving</Text>
          <Text style={[bijlageStyles.th, bijlageStyles.colUren]}>Uren</Text>
        </View>
        {sorted.map((t) => {
          const project = projectById.get(t.project_id);
          return (
            <View key={t.id} style={bijlageStyles.row} wrap={false}>
              <Text style={[bijlageStyles.td, bijlageStyles.colDate]}>
                {fmtPdfDate(t.datum, "d MMM yyyy")}
              </Text>
              <Text style={[bijlageStyles.td, bijlageStyles.colProject]}>
                {project?.naam ?? "—"}
              </Text>
              <Text style={[bijlageStyles.td, bijlageStyles.colOmschr]}>
                {t.omschrijving || "—"}
              </Text>
              <Text style={[bijlageStyles.td, bijlageStyles.colUren]}>
                {numFixed(t.uren)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={bijlageStyles.totals}>
        <Text style={[bijlageStyles.totalCell, brandStyle]}>
          Totaal: {totaalUren.toFixed(2)} uur
        </Text>
      </View>
    </Page>
  );
}
