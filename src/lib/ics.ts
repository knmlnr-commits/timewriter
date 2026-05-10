import ICAL from "ical.js";

export type IcsEvent = {
  uid: string;
  subject: string;
  location: string;
  start: Date;
  end: Date;
  durationHours: number;
  allDay: boolean;
};

export function parseIcs(text: string): IcsEvent[] {
  const jcal = ICAL.parse(text);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");
  const events: IcsEvent[] = [];
  for (const v of vevents) {
    const e = new ICAL.Event(v);
    const start = e.startDate?.toJSDate();
    const end = e.endDate?.toJSDate();
    if (!start || !end) continue;
    const allDay = Boolean(e.startDate?.isDate);
    if (allDay) continue;
    const durationMs = end.getTime() - start.getTime();
    if (durationMs <= 0) continue;
    const subject = (e.summary || "").trim();
    if (!subject) continue;
    events.push({
      uid: e.uid || `${start.toISOString()}-${subject}`,
      subject,
      location: e.location || "",
      start,
      end,
      durationHours: Math.round((durationMs / 3600000) * 100) / 100,
      allDay,
    });
  }
  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}
