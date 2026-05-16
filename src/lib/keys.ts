/**
 * Centralised key conventions. Versioned per resource so a breaking change
 * just bumps `:v1:` to `:v2:` and the old keys can be backfilled lazily.
 *
 * Tenanting: per-user (each user account is its own tenant; partner gets own login).
 */

export const NAMESPACE = "timewriter";

export const KEYS = {
  // top-level indexes
  usersIndex: () => `${NAMESPACE}:users:index`,

  // auth + identity
  userByEmail: (email: string) => `${NAMESPACE}:user-email:${email.toLowerCase()}`,
  user: (uid: string) => `${NAMESPACE}:user:${uid}`,
  session: (token: string) => `${NAMESPACE}:session:${token}`,
  userSessionsIndex: (uid: string) => `${NAMESPACE}:user:${uid}:sessions`,

  // klanten
  klantenIndex: (uid: string) => `${NAMESPACE}:user:${uid}:klanten:index`,
  klant: (uid: string, id: string) => `${NAMESPACE}:user:${uid}:klant:${id}`,

  // projecten
  projectenIndex: (uid: string) => `${NAMESPACE}:user:${uid}:projecten:index`,
  project: (uid: string, id: string) => `${NAMESPACE}:user:${uid}:project:${id}`,
  projectenByKlant: (uid: string, klantId: string) =>
    `${NAMESPACE}:user:${uid}:klant:${klantId}:projecten`,

  // tijdsregistraties
  tijdenIndex: (uid: string) => `${NAMESPACE}:user:${uid}:tijden:index`,
  tijd: (uid: string, id: string) => `${NAMESPACE}:user:${uid}:tijd:${id}`,
  tijdenByMonth: (uid: string, ym: string) => `${NAMESPACE}:user:${uid}:tijden:month:${ym}`,
  tijdenByProject: (uid: string, projectId: string) =>
    `${NAMESPACE}:user:${uid}:tijden:project:${projectId}`,
  tijdenByDate: (uid: string) => `${NAMESPACE}:user:${uid}:tijden:by-date`,
  // dedup for ics imports: external uid -> internal tijd id
  tijdByBronRef: (uid: string, bron: string, ref: string) =>
    `${NAMESPACE}:user:${uid}:tijd-ref:${bron}:${ref}`,

  // facturen
  facturenIndex: (uid: string) => `${NAMESPACE}:user:${uid}:facturen:index`,
  factuur: (uid: string, id: string) => `${NAMESPACE}:user:${uid}:factuur:${id}`,
  factuurNextNummer: (uid: string) => `${NAMESPACE}:user:${uid}:factuur:next-nummer`,

  // ics mapping memory (subject patterns -> project_id)
  icsMapping: (uid: string, subjectHash: string) =>
    `${NAMESPACE}:user:${uid}:ics-mapping:${subjectHash}`,
  icsMappingIndex: (uid: string) => `${NAMESPACE}:user:${uid}:ics-mapping:index`,

  // default werkweek (chat-assistent gebruikt dit als startpunt)
  defaultWeek: (uid: string) => `${NAMESPACE}:user:${uid}:default-week`,

  // web push subscriptions (per-device)
  pushSubsIndex: (uid: string) => `${NAMESPACE}:user:${uid}:push-subs`,
  pushSub: (uid: string, subId: string) => `${NAMESPACE}:user:${uid}:push-sub:${subId}`,

  // reminder de-dup zodat de cron 'm niet twee keer afvuurt op dezelfde dag
  reminderFired: (uid: string, patternId: string, dateIso: string) =>
    `${NAMESPACE}:user:${uid}:reminder-fired:${dateIso}:${patternId}`,
} as const;
