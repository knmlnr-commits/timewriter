import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Factuur, Klant } from "@/lib/types";
import type { Profile } from "@/lib/auth";

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
}: {
  factuur: Factuur;
  klant: Klant;
  profile: Profile;
  accentKleur: string;
}) {
  const brandStyle = { color: accentKleur };
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
              <Text>{format(new Date(factuur.factuurdatum), "d MMMM yyyy", { locale: nl })}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Vervaldatum</Text>
              <Text>{format(new Date(factuur.vervaldatum), "d MMMM yyyy", { locale: nl })}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Periode</Text>
              <Text>
                {format(new Date(factuur.periode_start), "d MMM", { locale: nl })} -{" "}
                {format(new Date(factuur.periode_eind), "d MMM yyyy", { locale: nl })}
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
          {factuur.regels.map((r, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.colDesc]}>{r.omschrijving}</Text>
              <Text style={[styles.td, styles.colNum]}>{r.aantal_uren.toFixed(2)}</Text>
              <Text style={[styles.td, styles.colNum]}>€ {r.uurtarief.toFixed(2)}</Text>
              <Text style={[styles.td, styles.colNum]}>€ {r.bedrag.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotaal</Text>
            <Text style={styles.totalValue}>€ {factuur.totaal_excl_btw.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>BTW {factuur.btw_percentage.toFixed(0)}%</Text>
            <Text style={styles.totalValue}>€ {factuur.btw_bedrag.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.totalFinal, brandStyle]}>Totaal</Text>
            <Text style={[styles.totalValue, styles.totalFinal, brandStyle]}>
              € {factuur.totaal_incl_btw.toFixed(2)}
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
    </Document>
  );
}
