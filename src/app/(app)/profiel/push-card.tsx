"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Convert base64url public key → Uint8Array for PushManager.subscribe. */
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

type State = "unknown" | "unsupported" | "needs-permission" | "subscribed" | "denied";

export function PushCard({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>("unknown");
  const [pending, start] = useTransition();
  const [pwaOnly, setPwaOnly] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    // iOS Safari laat push alleen toe als de PWA op het beginscherm is geinstalleerd.
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS only
      (typeof navigator !== "undefined" && navigator.standalone === true);
    if (isIos && !standalone) {
      setPwaOnly(true);
    }

    (async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setState("needs-permission");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setState("subscribed");
      } else if (Notification.permission === "denied") {
        setState("denied");
      } else {
        setState("needs-permission");
      }
    })();
  }, []);

  async function subscribe() {
    if (!vapidPublicKey) {
      toast.error("Push staat niet aan op deze omgeving (VAPID-keys ontbreken).");
      return;
    }
    start(async () => {
      try {
        const reg =
          (await navigator.serviceWorker.getRegistration()) ??
          (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "needs-permission");
          toast.warning("Toestemming voor notificaties geweigerd.");
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
        });

        const payload = sub.toJSON();
        const resp = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}));
          throw new Error(j.error ?? "Server weigerde subscription.");
        }
        setState("subscribed");
        toast.success("Notificaties op dit apparaat actief");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Activeren mislukt");
      }
    });
  }

  async function unsubscribe() {
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setState("needs-permission");
        toast.success("Notificaties uit op dit apparaat");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Uitschakelen mislukt");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--brand)]" />
          Notificaties op dit apparaat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Krijg een push-melding op de tijd die je per patroon instelt onder
          Standaard week. Bijvoorbeeld vrijdag 21:00 → &ldquo;Was Latin Dance?&rdquo; met
          één tap bevestigen.
        </p>

        {pwaOnly ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
            <Smartphone className="h-4 w-4 shrink-0" />
            <div>
              Op iPhone werken push-meldingen alleen als time-app op je beginscherm
              staat. Open de site in Safari, tap deel-knop &rarr; Voeg toe aan
              beginscherm. Open de app vanaf het icoon en kom hier terug.
            </div>
          </div>
        ) : null}

        {state === "unsupported" ? (
          <p className="text-xs text-muted-foreground">
            Deze browser ondersteunt geen web push.
          </p>
        ) : state === "denied" ? (
          <p className="text-xs text-amber-700">
            Je hebt eerder &lsquo;weigeren&rsquo; gekozen. Zet notificaties aan
            via je browser-instellingen voor deze site.
          </p>
        ) : state === "subscribed" ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-emerald-700 font-medium">Actief op dit apparaat ✓</span>
            <Button
              variant="outline"
              size="sm"
              onClick={unsubscribe}
              disabled={pending}
              className="gap-2"
            >
              <BellOff className="h-4 w-4" />
              Uitzetten
            </Button>
          </div>
        ) : (
          <Button onClick={subscribe} disabled={pending} className="gap-2">
            <Bell className="h-4 w-4" />
            Notificaties activeren
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
