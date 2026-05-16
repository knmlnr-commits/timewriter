import { NextResponse } from "next/server";
import webpush from "web-push";
import { format } from "date-fns";
import { getKv } from "@/lib/kv";
import { KEYS } from "@/lib/keys";
import { getDefaultWeek } from "@/lib/repo/default-week";
import { listProjecten } from "@/lib/repo/projecten";
import { dropPushSubscriptionById, listPushSubscriptions } from "@/lib/repo/push-subscriptions";
import type { UserRecord } from "@/lib/auth";
import type { Tijdsregistratie, WeekDay } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_TO_INDEX: Record<WeekDay, number> = {
  ma: 1, di: 2, wo: 3, do: 4, vr: 5, za: 6, zo: 0,
};
const INDEX_TO_DAY: Record<number, WeekDay> = {
  1: "ma", 2: "di", 3: "wo", 4: "do", 5: "vr", 6: "za", 0: "zo",
};

/**
 * Wordt elk kwartier aangeroepen door Vercel Cron. Voor elke ingelogde gebruiker:
 *  1. Haal default-week patronen op waar reminder_enabled aan staat
 *  2. Filter op patronen die vandaag draaien (matchende WeekDay) en waarvan
 *     reminder_time binnen het huidige venster valt (laatste 15 min)
 *  3. Skip patronen waarvoor we al een reminder hebben gestuurd vandaag,
 *     OF waarvoor de gebruiker vandaag al een tijd geboekt heeft op dat project
 *  4. Stuur push naar alle subscriptions van de gebruiker
 *
 * Authenticeert via Vercel's "Authorization: Bearer <CRON_SECRET>" header.
 * Lokaal: stuur dezelfde header handmatig.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("authorization");
  if (expected && got !== `Bearer ${expected}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json(
      { ok: false, error: "VAPID keys ontbreken; push-reminders inactief." },
      { status: 503 }
    );
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:beheerder@time-app.nl",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const kv = getKv();
  if (kv.driver === "absent") {
    return NextResponse.json({ ok: false, error: "KV niet geconfigureerd." }, { status: 503 });
  }

  const now = new Date();
  const today = INDEX_TO_DAY[now.getDay()];
  const todayIso = format(now, "yyyy-MM-dd");
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // Reminder mag tot 15 minuten te laat alsnog gestuurd worden (volgende cron-tick)
  const WINDOW_MIN = 15;

  const userIds = await kv.smembers(KEYS.usersIndex());
  const summary = {
    scanned_users: userIds.length,
    sent: 0,
    failed: 0,
    dropped_subs: 0,
    skipped_already_logged: 0,
    skipped_already_fired: 0,
  };

  for (const uid of userIds) {
    const user = await kv.get<UserRecord>(KEYS.user(uid));
    if (!user) continue;

    const [patterns, projecten, subs] = await Promise.all([
      getDefaultWeek(uid),
      listProjecten(uid),
      listPushSubscriptions(uid),
    ]);

    if (subs.length === 0) continue;

    const todaysTijdenIds = await kv.smembers(KEYS.tijdenByMonth(uid, todayIso.slice(0, 7)));
    let todayProjectIds: Set<string> | null = null;
    if (todaysTijdenIds.length > 0) {
      const rows = await kv.mget<Tijdsregistratie>(
        ...todaysTijdenIds.map((id) => KEYS.tijd(uid, id))
      );
      todayProjectIds = new Set(
        rows
          .filter((t): t is Tijdsregistratie => Boolean(t) && t!.datum === todayIso)
          .map((t) => t.project_id)
      );
    }

    for (const p of patterns) {
      if (!p.reminder_enabled || !p.reminder_time) continue;
      if (p.day !== today) continue;
      const [h, m] = p.reminder_time.split(":").map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
      const reminderMinutes = h * 60 + m;
      // venster: reminder_time tot reminder_time + WINDOW_MIN
      const delta = nowMinutes - reminderMinutes;
      if (delta < 0 || delta > WINDOW_MIN) continue;

      // Dedup: hebben we deze al gestuurd vandaag?
      const firedKey = KEYS.reminderFired(uid, p.id, todayIso);
      const alreadyFired = await kv.get<string>(firedKey);
      if (alreadyFired) {
        summary.skipped_already_fired++;
        continue;
      }

      // Slim: skip als de gebruiker vandaag al uren heeft geboekt op dat project
      if (todayProjectIds && todayProjectIds.has(p.project_id)) {
        await kv.set(firedKey, "logged-already", { ex: 60 * 60 * 26 });
        summary.skipped_already_logged++;
        continue;
      }

      const project = projecten.find((x) => x.id === p.project_id);
      const projectNaam = project?.naam ?? "onbekend project";
      const title = `Was ${projectNaam}?`;
      const body =
        p.omschrijving
          ? `${p.hours}u — ${p.omschrijving}. Tap om te bevestigen.`
          : `${p.hours}u op ${todayIso}. Tap om te bevestigen.`;
      const url = `/uren/bevestig?pattern_id=${encodeURIComponent(p.id)}&date=${encodeURIComponent(todayIso)}`;

      const payload = JSON.stringify({
        title,
        body,
        url,
        tag: `pattern-${p.id}-${todayIso}`,
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 3600 }
          );
          summary.sent++;
        } catch (e) {
          const statusCode = (e as { statusCode?: number })?.statusCode;
          // 404/410 = subscription verlopen of geweigerd; opruimen
          if (statusCode === 404 || statusCode === 410) {
            await dropPushSubscriptionById(uid, sub.id);
            summary.dropped_subs++;
          } else {
            summary.failed++;
          }
        }
      }
      // Mark fired voor 26 uur (overschot voor zomertijd-randen)
      await kv.set(firedKey, "sent", { ex: 60 * 60 * 26 });
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
