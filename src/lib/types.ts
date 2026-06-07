export type ID = string;

export type Klant = {
  id: ID;
  user_id: ID;
  naam: string;
  /** t.a.v. naam — contactpersoon binnen de klant-organisatie. Optioneel, kan leeg zijn. */
  factuur_taa: string;
  factuur_email: string;
  factuur_adres: string;
  factuur_postcode: string;
  factuur_plaats: string;
  /** Debiteurnummer dat de klant aan jou heeft toegekend. Optioneel. */
  debiteurnummer: string;
  standaard_uurtarief: number | null;
  btw_percentage: number;
  betaaltermijn_dagen: number;
  notities: string;
  archief: boolean;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: ID;
  user_id: ID;
  klant_id: ID | null;
  naam: string;
  omschrijving: string;
  uurtarief: number | null;
  kleur: string;
  factureerbaar: boolean;
  archief: boolean;
  created_at: string;
  updated_at: string;
};

export type Tijdsregistratie = {
  id: ID;
  user_id: ID;
  project_id: ID;
  datum: string; // YYYY-MM-DD
  uren: number;
  omschrijving: string;
  factureerbaar: boolean;
  gefactureerd: boolean;
  factuur_id: ID | null;
  bron: "handmatig" | "ics_import" | "graph_import" | "tekst_import";
  bron_ref: string | null;
  start_tijd: string | null; // HH:mm
  eind_tijd: string | null;
  created_at: string;
  updated_at: string;
};

export type FactuurRegel = {
  omschrijving: string;
  aantal_uren: number;
  uurtarief: number;
  bedrag: number;
  tijd_ids: ID[];
};

export type FactuurStatus = "concept" | "verzonden" | "betaald" | "geannuleerd";

export type Factuur = {
  id: ID;
  user_id: ID;
  klant_id: ID;
  factuurnummer: string;
  periode_start: string;
  periode_eind: string;
  factuurdatum: string;
  vervaldatum: string;
  regels: FactuurRegel[];
  totaal_excl_btw: number;
  btw_percentage: number;
  btw_bedrag: number;
  totaal_incl_btw: number;
  status: FactuurStatus;
  notities: string;
  /**
   * Wanneer true: extra pagina (PDF) en sheet (xlsx) met alle onderliggende
   * tijdsregistraties uit regel.tijd_ids. Geeft de klant volledige
   * transparantie waar de gefactureerde uren aan besteed zijn.
   */
  include_uren_bijlage?: boolean;
  /** "Uw ordernummer" / PO-referentie van de klant. Optioneel. */
  uw_ordernummer?: string;
  /** Betalingskenmerk dat de klant moet vermelden bij overboeking. Optioneel. */
  betalingskenmerk?: string;
  verzonden_op: string | null;
  betaald_op: string | null;
  created_at: string;
  updated_at: string;
};

export type IcsMapping = {
  id: ID;
  user_id: ID;
  subject_pattern: string; // lower-cased exact subject for now
  project_id: ID;
  created_at: string;
};

export type WeekDay = "ma" | "di" | "wo" | "do" | "vr" | "za" | "zo";

export const WEEK_DAYS: WeekDay[] = ["ma", "di", "wo", "do", "vr", "za", "zo"];

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  ma: "Maandag",
  di: "Dinsdag",
  wo: "Woensdag",
  do: "Donderdag",
  vr: "Vrijdag",
  za: "Zaterdag",
  zo: "Zondag",
};

export type WeeklyPattern = {
  id: ID;
  day: WeekDay;
  hours: number;
  project_id: ID;
  omschrijving: string;
  /** Wanneer aan: web-push reminder op deze tijd (HH:mm) op de betreffende dag. */
  reminder_enabled?: boolean;
  reminder_time?: string;
};

export const BONNETJE_CATEGORIEEN = [
  "reiskosten",
  "horeca",
  "kantoor",
  "software",
  "telefoon_internet",
  "marketing",
  "opleiding",
  "representatie",
  "overig",
] as const;

export type BonnetjeCategorie = (typeof BONNETJE_CATEGORIEEN)[number];

export const BONNETJE_CATEGORIE_LABEL: Record<BonnetjeCategorie, string> = {
  reiskosten: "Reiskosten",
  horeca: "Eten & drinken",
  kantoor: "Kantoor",
  software: "Software & abonnementen",
  telefoon_internet: "Telefoon & internet",
  marketing: "Marketing",
  opleiding: "Opleiding & boeken",
  representatie: "Representatie",
  overig: "Overig",
};

export type Bonnetje = {
  id: ID;
  user_id: ID;
  /** Datum op de bon. YYYY-MM-DD. */
  datum: string;
  /** Totaalbedrag incl. BTW in euro's. */
  bedrag: number;
  /** BTW-bedrag in euro's; null als niet bekend / niet getoond op bon. */
  btw_bedrag: number | null;
  /** ISO 4217. Default EUR. */
  valuta: string;
  /** Naam van de leverancier (winkel/restaurant/etc.). */
  leverancier: string;
  categorie: BonnetjeCategorie;
  omschrijving: string;
  /** Optionele klant waar deze kosten op doorbelast worden. */
  klant_id: ID | null;
  /** Optioneel project. */
  project_id: ID | null;
  /** Wanneer true en gekoppeld aan klant: kan op een factuur worden gezet. */
  doorbelast: boolean;
  /** Factuur waarop deze kosten al doorbelast zijn, null als nog open. */
  factuur_id: ID | null;
  /** Base64 data URL van de foto (geresized). Leeg als handmatige invoer zonder foto. */
  foto_data: string;
  bron: "handmatig" | "foto_ai";
  created_at: string;
  updated_at: string;
};

export type PushSubscriptionRecord = {
  id: ID;
  user_id: ID;
  endpoint: string;
  /** ECDH public key voor encryptie van de push payload (base64-url) */
  p256dh: string;
  /** Auth secret voor encryptie (base64-url) */
  auth: string;
  /** Optionele user-agent string voor identificatie van het apparaat. */
  user_agent: string;
  created_at: string;
};
