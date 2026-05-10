# TijdRegistratie

Persoonlijke tijdregistratie + facturatie ter vervanging van Harvest, voor freelance / interim werk. Eén hoofdgebruiker plus partner; elk eigen account, eigen data, eigen klanten en projecten.

Aan het eind van de maand binnen vijf minuten een correcte factuur, met optionele import vanuit Outlook-agenda (.ics).

## Tech stack

- **Next.js 16** (App Router, TypeScript) — `create-next-app` koos Next 16; de App Router-API is identiek aan Next 15.
- **Tailwind v4** met design-tokens via CSS-variabelen
- **shadcn/ui** stijl componenten (in-repo, geen externe registry)
- **React Hook Form + Zod** voor validatie
- **date-fns** met locale `nl`
- **Recharts** voor dashboard-grafieken
- **xlsx** voor Excel-export
- **@react-pdf/renderer** voor PDF-facturen
- **ical.js** voor .ics-parsing
- **Redis / Upstash KV** voor opslag — geen Postgres, geen ORM
- **Vercel** als deploy-target

### Bewuste afwijking van Postgres + RLS

Dit project gebruikt het "marktradar"-patroon: dual-driver KV met key-prefixes als multi-tenant scoping. Per-user scoping zit in elke key zelf (`timewriter:user:{uid}:...`); er is dus geen RLS nodig, omdat data alleen wordt benaderd via een sessie die de `user_id` bepaalt en alle keys door die helper-laag worden geconstrueerd.

Tegenover Postgres:
- Geen foreign keys: integriteit wordt afgedwongen in de repository-laag (`src/lib/repo/*`)
- Geen SQL-aggregaties: dashboard som telt in Node over sorted-set ranges
- Geen Storage bucket: PDF / Excel worden on-demand gestreamd door de route, niet bewaard
- Geen Postgres function voor factuurnummers: atomic `INCR` in KV (zie `nextFactuurnummer`); race-veiligheid wordt afgedekt door `tests/factuurnummer-race.test.ts`

Wanneer dit patroon breekt (analytics-queries over alle gebruikers, full-text, joins, strikte schema-evolutie) stap je over naar Postgres + Prisma. Voor deze use case is KV sneller, goedkoper en eenvoudiger.

## Key-conventies

Alle keys staan centraal in `src/lib/keys.ts`. Versie zit in de key zelf — bij een breaking change spring je naar `:v2:` en backfillt lazy.

| Key | Inhoud |
| --- | --- |
| `timewriter:users:index` | set van alle user-ids |
| `timewriter:user-email:{email}` | reverse lookup naar user-id |
| `timewriter:user:{uid}` | user-record met profiel-blob |
| `timewriter:session:{token}` | actieve sessie met TTL (30 dgn) |
| `timewriter:user:{uid}:klanten:index` | set klant-ids |
| `timewriter:user:{uid}:klant:{id}` | klant-record |
| `timewriter:user:{uid}:projecten:index` | set project-ids |
| `timewriter:user:{uid}:project:{id}` | project-record |
| `timewriter:user:{uid}:tijden:by-date` | sorted-set op datum-score voor periode-queries |
| `timewriter:user:{uid}:tijden:month:{YYYY-MM}` | set tijd-ids per maand |
| `timewriter:user:{uid}:tijden:project:{pid}` | set tijd-ids per project |
| `timewriter:user:{uid}:tijd:{id}` | tijdregistratie |
| `timewriter:user:{uid}:tijd-ref:{bron}:{ref}` | deduplicatie-pointer voor .ics-import |
| `timewriter:user:{uid}:facturen:index` | set factuur-ids |
| `timewriter:user:{uid}:factuur:{id}` | factuur-record incl. regels |
| `timewriter:user:{uid}:factuur:next-nummer` | atomic teller, INCR-gestuurd |
| `timewriter:user:{uid}:ics-mapping:{hash}` | onthouden subject → project mapping |

## Lokaal draaien

Geen Docker, geen lokale database nodig.

1. **Dependencies**
   ```bash
   pnpm install
   ```

2. **KV configureren** (één van de twee)

   - Upstash Redis (gratis tier) of Vercel KV via REST:
     ```bash
     KV_REST_API_URL=https://...
     KV_REST_API_TOKEN=...
     ```
   - Native Redis (bv. lokaal of self-hosted):
     ```bash
     REDIS_URL=redis://localhost:6379
     ```

   Zonder KV werkt login niet (signup retourneert een waarschuwing). De rest van de UI rendert wel.

3. **Env-bestand**
   ```bash
   cp .env.example .env.local
   # vul KV-vars en een SESSION_SECRET (32+ random bytes hex)
   ```

4. **Starten**
   ```bash
   pnpm dev
   ```

   Open http://localhost:3000 — je wordt naar `/login` of `/signup` gestuurd.

## Tests

```bash
pnpm test
```

Bevat onder andere:
- `tests/parse-uren.test.ts` — decimaal- en HH:mm-parsing
- `tests/factuurnummer-race.test.ts` — 50 parallelle calls naar `nextFactuurnummer` moeten unieke, opeenvolgende nummers opleveren (race-veiligheid van het KV INCR-patroon)

## Productie deploy (Vercel)

1. Maak een Upstash Redis database (of Vercel KV)
2. Kopieer de KV-vars naar de Vercel env (Production)
3. Voeg een `SESSION_SECRET` toe (random 32 bytes hex)
4. Push naar GitHub, koppel het repo aan Vercel
5. Deploy

De PDF- en Excel-routes draaien on-demand in een Node-runtime; er is geen Storage bucket nodig.

## Tweede gebruiker (partner)

1. Open de productie-URL en klik "Aanmaken"
2. Eigen e-mail en wachtwoord
3. Klaar; alle data wordt per-user gescoped via key-prefixes

Wil je voorkomen dat willekeurige bezoekers signup kunnen doen, zet de allowlist:

```
SIGNUP_ALLOWLIST=hoofd@example.com,partner@example.com
```

## Belangrijke files

- `src/lib/kv.ts` — dual-driver abstractie (Upstash REST / native Redis / absent)
- `src/lib/keys.ts` — alle key-conventies op één plek
- `src/lib/auth.ts` — scrypt + cookie-sessie + profile helpers
- `src/lib/repo/*` — read/write voor klanten, projecten, tijden, facturen, ics-mapping
- `src/lib/pdf/invoice.tsx` — @react-pdf/renderer factuur template
- `src/app/(app)/*` — beschermde routes binnen het app-layout
- `src/app/welkom/*` — onboarding na signup
- `src/components/snel-invoer/*` — globale Cmd/Ctrl+N modal voor tijdregistratie

## Wat niet in de MVP zit

- Microsoft Graph OAuth voor on-demand calendar fetch (.ics-flow doet hetzelfde handmatig)
- Multi-tenant uitbreiding (gedeelde klanten binnen huishouden); per-user is bewust simpel gehouden
- Analytics, tracking, externe scripts

## Conventies

- Nederlandse UI-teksten; Engels in code en commits
- Geen em-dashes in UI of code-comments
- Geen pure zwart; accent default `#E8732A` overschrijfbaar per gebruiker (oranje, blauw, groen, paars, teal, grijs)
- Server Components als default; Server Actions voor mutaties
