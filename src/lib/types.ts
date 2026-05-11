export type ID = string;

export type Klant = {
  id: ID;
  user_id: ID;
  naam: string;
  factuur_email: string;
  factuur_adres: string;
  factuur_postcode: string;
  factuur_plaats: string;
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
