"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Play, Square } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Klant, Project } from "@/lib/types";
import { createTijdAction } from "./actions";
import { roundHours } from "@/lib/parse-uren";

const KEY = "tw:timer";

type State = { startedAt: number; projectId: string } | null;

function readState(): State {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v.startedAt === "number" && typeof v.projectId === "string") return v;
  } catch {}
  return null;
}
function writeState(s: State) {
  if (typeof window === "undefined") return;
  if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
  else window.localStorage.removeItem(KEY);
}

export function Timer({ projecten, klanten }: { projecten: Project[]; klanten: Klant[] }) {
  const [state, setState] = useState<State>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [projectId, setProjectId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setState(readState());
  }, []);

  useEffect(() => {
    if (state) {
      interval.current = setInterval(() => setNow(Date.now()), 1000);
      return () => {
        if (interval.current) clearInterval(interval.current);
      };
    }
  }, [state]);

  const elapsed = state ? Math.max(0, now - state.startedAt) : 0;
  const hh = Math.floor(elapsed / 3600000);
  const mm = Math.floor((elapsed % 3600000) / 60000);
  const ss = Math.floor((elapsed % 60000) / 1000);
  const display = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  const klantNaam = (id: string | null) =>
    id ? klanten.find((k) => k.id === id)?.naam ?? "" : "Persoonlijk";

  const options = projecten.map((p) => ({ value: p.id, label: p.naam, hint: klantNaam(p.klant_id) }));

  function startTimer() {
    if (!projectId) {
      toast.error("Kies eerst een project");
      return;
    }
    const s: State = { startedAt: Date.now(), projectId };
    writeState(s);
    setState(s);
  }

  function stopTimer() {
    if (!state) return;
    const hours = roundHours(elapsed / 3600000);
    if (hours < 0.01) {
      writeState(null);
      setState(null);
      return;
    }
    const fd = new FormData();
    fd.set("project_id", state.projectId);
    fd.set("datum", format(new Date(state.startedAt), "yyyy-MM-dd"));
    fd.set("uren", String(hours));
    fd.set("omschrijving", "Timer");
    fd.set("factureerbaar", "true");
    start(async () => {
      const r = await createTijdAction(fd);
      if (r.ok) {
        toast.success(`Geregistreerd: ${hours.toFixed(2)} u`);
        writeState(null);
        setState(null);
      } else {
        toast.error(r.error ?? "Mislukt");
      }
    });
  }

  if (state) {
    const p = projecten.find((x) => x.id === state.projectId);
    return (
      <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p?.kleur ?? "var(--brand)" }} />
        <span className="text-sm font-medium tabular-nums">{display}</span>
        <span className="text-xs text-muted-foreground hidden md:inline">{p?.naam}</span>
        <Button size="sm" variant="destructive" onClick={stopTimer} disabled={pending} className="gap-1">
          <Square className="h-3 w-3" /> Stop
        </Button>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Play className="h-4 w-4" /> Timer
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="end">
        <div className="text-sm font-medium">Timer starten</div>
        <Combobox
          options={options}
          value={projectId}
          onChange={setProjectId}
          placeholder="Kies een project"
        />
        <Button onClick={startTimer} className="w-full gap-2" disabled={!projectId}>
          <Play className="h-4 w-4" /> Start
        </Button>
      </PopoverContent>
    </Popover>
  );
}
