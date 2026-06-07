import type Anthropic from "@anthropic-ai/sdk";
import { BONNETJE_CATEGORIEEN } from "@/lib/types";

export const EXTRACT_BONNETJE_TOOL: Anthropic.Tool = {
  name: "extract_receipt",
  description:
    "Lees de gegevens van een uploaded bon/factuur uit en geef ze terug als gestructureerde data. " +
    "Roep deze functie altijd aan zodra je de bon hebt bekeken. Geef de best mogelijke schatting per veld; " +
    "laat een veld leeg / null als het echt niet leesbaar is.",
  input_schema: {
    type: "object",
    properties: {
      datum: {
        type: "string",
        description:
          "Datum op de bon in YYYY-MM-DD formaat. Als er alleen een tijd staat zonder datum, kies dan de huidige datum.",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      },
      bedrag: {
        type: "number",
        description: "Totaalbedrag inclusief BTW in euro's. Decimaal, bv. 23.45.",
        minimum: 0,
      },
      btw_bedrag: {
        type: ["number", "null"],
        description:
          "BTW-bedrag in euro's als dit expliciet op de bon staat. Null als er geen BTW-regel zichtbaar is.",
      },
      valuta: {
        type: "string",
        description: "ISO 4217 valutacode. EUR als er geen ander symbool staat.",
        default: "EUR",
      },
      leverancier: {
        type: "string",
        description:
          "Naam van de winkel / het restaurant / de leverancier. Kies de meest prominente naam, geen adres of KVK-nummer.",
      },
      categorie: {
        type: "string",
        enum: [...BONNETJE_CATEGORIEEN],
        description:
          "Best passende categorie op basis van de leverancier en items. " +
          "horeca = restaurant/cafe/lunch/avondeten. reiskosten = parkeren, OV, brandstof, taxi. " +
          "kantoor = papier/pennen/printer. software = SaaS/abonnementen. " +
          "telefoon_internet = telecom/internet/mobiel. marketing = advertenties/promotie. " +
          "opleiding = boeken/cursussen/conferenties. representatie = relatiegeschenken. " +
          "overig = als niks anders past.",
      },
      omschrijving: {
        type: "string",
        description:
          "Korte vrije omschrijving (max ~80 chars), bv. 'Lunch met klant', 'Brandstof onderweg naar Rotterdam'. " +
          "Als context ontbreekt: een feitelijke samenvatting van wat is gekocht.",
      },
      vertrouwen: {
        type: "string",
        enum: ["hoog", "medium", "laag"],
        description:
          "Hoe zeker ben je van de extractie? laag bij onleesbare/wazige bonnen, hoog bij scherpe Nederlandse bon.",
      },
    },
    required: ["bedrag", "leverancier", "categorie", "vertrouwen"],
  },
};
