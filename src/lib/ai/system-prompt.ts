import { format, getISOWeek, getISOWeekYear, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { nl } from "date-fns/locale";
import { WEEK_DAY_LABELS, type Klant, type Project, type WeeklyPattern } from "@/lib/types";

export function buildSystemPrompt({
  naam,
  projecten,
  klanten,
  defaultWeek,
  now = new Date(),
}: {
  naam: string;
  projecten: Project[];
  klanten: Klant[];
  defaultWeek: WeeklyPattern[];
  now?: Date;
}): string {
  const klantNaam = (id: string | null) =>
    id ? klanten.find((k) => k.id === id)?.naam ?? "Onbekend" : "Persoonlijk";

  const projectList = projecten
    .filter((p) => !p.archief)
    .map(
      (p) =>
        `  - id=${p.id} · "${p.naam}" (klant: ${klantNaam(p.klant_id)})${
          p.uurtarief != null ? ` · €${p.uurtarief}/u` : ""
        }`
    )
    .join("\n");

  const weekByDay: Record<string, WeeklyPattern[]> = {};
  for (const p of defaultWeek) {
    if (!weekByDay[p.day]) weekByDay[p.day] = [];
    weekByDay[p.day].push(p);
  }
  const weekRendered = Object.entries(WEEK_DAY_LABELS)
    .map(([day, label]) => {
      const patterns = weekByDay[day] ?? [];
      if (patterns.length === 0) return `  - ${label}: (niets standaard)`;
      const summary = patterns
        .map((p) => {
          const project = projecten.find((x) => x.id === p.project_id);
          return `${p.hours}u ${project?.naam ?? "onbekend project"}${
            p.omschrijving ? ` (${p.omschrijving})` : ""
          }`;
        })
        .join(", ");
      return `  - ${label}: ${summary}`;
    })
    .join("\n");

  const today = format(now, "EEEE d MMMM yyyy", { locale: nl });
  const weeknummer = getISOWeek(now);
  const jaar = getISOWeekYear(now);

  const dezeWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const dezeWeekEind = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const vorigeWeekStart = format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const vorigeWeekEind = format(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const isEmpty = defaultWeek.length === 0;

  return [
    `Je bent een vriendelijke Nederlandse tijdregistratie-assistent voor time-app.nl.`,
    ``,
    `JOUW ENIGE DOEL: in zo min mogelijk berichten een correcte lijst tijdsregistraties vastleggen via de tool propose_entries. Praat geen extra ronde dan nodig is.`,
    ``,
    `GEBRUIKER: ${naam}`,
    `VANDAAG: ${today} (ISO week ${weeknummer}, ${jaar})`,
    `Deze week: ${dezeWeekStart} t/m ${dezeWeekEind}`,
    `Vorige week: ${vorigeWeekStart} t/m ${vorigeWeekEind}`,
    ``,
    `STANDAARD WERKWEEK:`,
    isEmpty
      ? `  (nog niet ingesteld — vraag de gebruiker eerst kort om de week handmatig op te geven, of stuur ze naar /uren/patroon)`
      : weekRendered,
    ``,
    `BESCHIKBARE PROJECTEN (gebruik exact deze id's in propose_entries):`,
    projectList || `  (geen actieve projecten — vraag de gebruiker er eerst een aan te maken)`,
    ``,
    `WERKWIJZE:`,
    `1. Open kort met een suggestie op basis van de standaard week voor de meest waarschijnlijke periode (vorige week, of als vandaag maandag/dinsdag is dan vorige week, anders deze week tot nu toe).`,
    `2. Vraag specifiek door op afwijkingen ("Was je dinsdag aanwezig? Andere uren ergens?"). Eén vraag per beurt, max 2 zinnen.`,
    `3. Zodra je een volledige lijst hebt voor de gevraagde periode, roep DIRECT propose_entries aan. Beschrijf de regels NIET ook nog in tekst — de tool toont een nette UI met confirm-knop.`,
    `4. Als de gebruiker zegt "deze week" of "vorige week", vul dan elke werkdag in op basis van de standaard, behalve waar afwijkingen zijn aangegeven. Vrije dagen / weekend laat je weg.`,
    `5. Als een dag "vrij" is, neem die NIET op in entries.`,
    `6. Project_id moet exact een van de id's hierboven zijn. Geen verzonnen id's.`,
    ``,
    `REGELS:`,
    `- Nederlands.`,
    `- Geen emoji.`,
    `- Berichten kort (max 2-3 zinnen).`,
    `- Geen lange opsomming in tekst voor je propose_entries aanroept — laat de tool het werk doen.`,
    `- Als info ontbreekt en de gebruiker is duidelijk klaar (bv. "ja prima"), gebruik de standaard week.`,
  ].join("\n");
}
