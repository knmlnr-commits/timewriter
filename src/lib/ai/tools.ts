import type Anthropic from "@anthropic-ai/sdk";

export const PROPOSE_ENTRIES_TOOL: Anthropic.Tool = {
  name: "propose_entries",
  description:
    "Stel een complete lijst tijdsregistraties voor op basis van wat de gebruiker heeft beschreven. Roep deze functie aan zodra je voldoende informatie hebt om de gevraagde periode in te vullen. Geef ALTIJD alle regels in één enkele call — niet meerdere keren aanroepen voor losse dagen. De UI toont automatisch een bevestigings-card; beschrijf de regels niet ook nog in tekst.",
  input_schema: {
    type: "object",
    properties: {
      samenvatting: {
        type: "string",
        description:
          "Eén korte zin voor de gebruiker over wat je hebt ingevuld en welke afwijkingen er waren. Bijvoorbeeld: 'Vorige week standaard plus dinsdag vrij.'",
      },
      entries: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            datum: {
              type: "string",
              description: "Datum in YYYY-MM-DD",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            },
            project_id: {
              type: "string",
              description:
                "Exact één van de project-id's uit de meegegeven lijst in de system prompt. Verzin geen id's.",
            },
            uren: {
              type: "number",
              minimum: 0.25,
              maximum: 24,
              description: "Aantal uren als decimaal, bijvoorbeeld 1.5 voor anderhalf uur.",
            },
            omschrijving: {
              type: "string",
              description:
                "Korte omschrijving van wat er gedaan is. Mag leeg als de gebruiker niets bijzonders heeft genoemd.",
            },
          },
          required: ["datum", "project_id", "uren"],
        },
      },
    },
    required: ["entries", "samenvatting"],
  },
};
