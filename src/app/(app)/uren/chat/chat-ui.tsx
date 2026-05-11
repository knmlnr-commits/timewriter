"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Klant, Project, WeeklyPattern } from "@/lib/types";
import { WEEK_DAY_LABELS } from "@/lib/types";
import { commitChatEntriesAction } from "./actions";

type ApiMessage = {
  role: "user" | "assistant";
  content: string | { type: "text"; text: string }[];
};

type ProposedEntry = {
  datum: string;
  project_id: string;
  uren: number;
  omschrijving?: string;
};

type UiMessage =
  | { id: string; role: "user" | "assistant"; kind: "text"; text: string }
  | {
      id: string;
      role: "assistant";
      kind: "proposal";
      text: string;
      samenvatting: string;
      entries: ProposedEntry[];
      committed?: boolean;
    }
  | { id: string; role: "assistant"; kind: "system-note"; text: string };

export function ChatUI({
  projecten,
  klanten,
  defaultWeek,
  userName,
  aiConfigured,
}: {
  projecten: Project[];
  klanten: Klant[];
  defaultWeek: WeeklyPattern[];
  userName: string;
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<UiMessage[]>(() => initialMessages(userName, defaultWeek, projecten, aiConfigured));
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [committing, startCommit] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll naar onderen bij nieuwe berichten
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const projectById = useMemo(() => new Map(projecten.map((p) => [p.id, p])), [projecten]);
  const klantById = useMemo(() => new Map(klanten.map((k) => [k.id, k])), [klanten]);

  const apiMessages: ApiMessage[] = useMemo(
    () =>
      messages
        .filter((m): m is Extract<UiMessage, { kind: "text" | "proposal" }> => m.kind !== "system-note")
        .map((m): ApiMessage => {
          if (m.kind === "proposal") {
            return {
              role: "assistant",
              content: m.text
                ? [{ type: "text", text: m.text }]
                : [{ type: "text", text: m.samenvatting || "(voorstel verstuurd)" }],
            };
          }
          return { role: m.role, content: m.text };
        }),
    [messages]
  );

  async function send(userText: string) {
    if (!userText.trim()) return;
    if (!aiConfigured) {
      toast.error("Chat-assistent niet geconfigureerd op deze omgeving.");
      return;
    }

    const userMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      kind: "text",
      text: userText.trim(),
    };
    const nextHistory = [...apiMessages, { role: "user" as const, content: userMsg.text }];

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const resp = await fetch("/api/uren/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextHistory }),
      });
      const data = await resp.json();
      if (!resp.ok || data.kind === "error") {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            kind: "system-note",
            text: data.error ?? `Fout (${resp.status}).`,
          },
        ]);
        return;
      }

      if (data.kind === "proposal") {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            kind: "proposal",
            text: data.text ?? "",
            samenvatting: data.samenvatting ?? "",
            entries: data.entries ?? [],
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            kind: "text",
            text: data.text || "(geen tekst)",
          },
        ]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "system-note",
          text: e instanceof Error ? e.message : "Verbinding mislukt.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function commit(proposalId: string, entries: ProposedEntry[]) {
    startCommit(async () => {
      const r = await commitChatEntriesAction(entries);
      if (!r.ok) {
        toast.error(r.error ?? "Boeken mislukt");
        return;
      }
      const created = r.created ?? 0;
      const dup = r.duplicates ?? 0;
      toast.success(
        `Geboekt: ${created} regel${created === 1 ? "" : "s"}${dup > 0 ? ` (${dup} duplicaat${dup === 1 ? "" : "en"})` : ""}`
      );
      setMessages((m) =>
        m.map((msg) =>
          msg.id === proposalId && msg.kind === "proposal" ? { ...msg, committed: true } : msg
        )
      );
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col md:h-[calc(100vh-14rem)]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border bg-card p-3 md:p-4 space-y-3"
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            projectById={projectById}
            klantById={klantById}
            committing={committing}
            onCommit={(entries) => commit(msg.id, entries)}
          />
        ))}
        {thinking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pl-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>aan het nadenken</span>
          </div>
        ) : null}
      </div>

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={aiConfigured ? "Typ je antwoord..." : "Chat niet beschikbaar"}
          disabled={!aiConfigured || thinking}
          autoFocus
          enterKeyHint="send"
        />
        <Button type="submit" disabled={!aiConfigured || thinking || !input.trim()} className="gap-2">
          {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="hidden sm:inline">Verstuur</span>
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({
  msg,
  projectById,
  klantById,
  committing,
  onCommit,
}: {
  msg: UiMessage;
  projectById: Map<string, Project>;
  klantById: Map<string, Klant>;
  committing: boolean;
  onCommit: (entries: ProposedEntry[]) => void;
}) {
  if (msg.kind === "system-note") {
    return (
      <div className="mx-auto max-w-md rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 text-center">
        {msg.text}
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--brand)] px-3 py-2 text-sm text-[var(--brand-foreground)] whitespace-pre-wrap break-words">
          {msg.kind === "text" ? msg.text : ""}
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex flex-col gap-2 items-start">
      <div className="flex items-start gap-2 max-w-[90%]">
        <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm whitespace-pre-wrap break-words">
          {msg.kind === "text" ? msg.text : msg.samenvatting || "Voorstel:"}
        </div>
      </div>
      {msg.kind === "proposal" ? (
        <ProposalCard
          entries={msg.entries}
          committed={msg.committed}
          committing={committing}
          projectById={projectById}
          klantById={klantById}
          onCommit={() => onCommit(msg.entries)}
        />
      ) : null}
    </div>
  );
}

function ProposalCard({
  entries,
  committed,
  committing,
  projectById,
  klantById,
  onCommit,
}: {
  entries: ProposedEntry[];
  committed?: boolean;
  committing: boolean;
  projectById: Map<string, Project>;
  klantById: Map<string, Klant>;
  onCommit: () => void;
}) {
  const total = entries.reduce((s, e) => s + e.uren, 0);
  return (
    <Card className="ml-8 w-full max-w-xl">
      <CardContent className="p-3 space-y-2">
        <div className="space-y-1">
          {entries.map((e, i) => {
            const project = projectById.get(e.project_id);
            const klant = project?.klant_id ? klantById.get(project.klant_id) : null;
            const safeDate = (() => {
              const d = new Date(e.datum);
              return Number.isFinite(d.getTime())
                ? format(d, "EEE d MMM", { locale: nl })
                : e.datum;
            })();
            return (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-md border-l-4 px-2 py-1.5 text-xs"
                style={{ borderLeftColor: project?.kleur ?? "var(--border)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {project?.naam ?? "Onbekend project"}
                  </div>
                  <div className="text-muted-foreground truncate">
                    {safeDate} &middot; {klant?.naam ?? "Persoonlijk"}
                    {e.omschrijving ? ` &middot; ${e.omschrijving}` : ""}
                  </div>
                </div>
                <div className="font-semibold tabular-nums shrink-0">
                  {e.uren.toFixed(2)} u
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs">
          <span className="text-muted-foreground">
            {entries.length} regel{entries.length === 1 ? "" : "s"} &middot;{" "}
            <span className="font-medium tabular-nums">{total.toFixed(2)} u</span>
          </span>
          {committed ? (
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Geboekt
            </span>
          ) : (
            <Button size="sm" onClick={onCommit} disabled={committing}>
              {committing ? "Boeken..." : "Boek deze uren"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function initialMessages(
  userName: string,
  defaultWeek: WeeklyPattern[],
  projecten: Project[],
  aiConfigured: boolean
): UiMessage[] {
  if (!aiConfigured) {
    return [
      {
        id: crypto.randomUUID(),
        role: "assistant",
        kind: "system-note",
        text: "Chat-assistent niet geconfigureerd op deze omgeving (ANTHROPIC_API_KEY ontbreekt).",
      },
    ];
  }

  if (defaultWeek.length === 0) {
    return [
      {
        id: crypto.randomUUID(),
        role: "assistant",
        kind: "text",
        text: `Hi ${userName}, je hebt nog geen standaard werkweek. Stel die eerst even in, dan kan ik je elke week binnen 30 seconden bijwerken.`,
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        kind: "system-note",
        text: "Tip: klik rechtsboven op 'Standaard week' om je vaste dagen vast te leggen.",
      },
    ];
  }

  const summary = summariseDefaultWeek(defaultWeek, projecten);
  return [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      kind: "text",
      text: `Hi ${userName}. Je standaard week ziet er zo uit:\n${summary}\n\nWelke periode wil je vastleggen, en zijn er afwijkingen?`,
    },
  ];
}

function summariseDefaultWeek(patterns: WeeklyPattern[], projecten: Project[]): string {
  const byDay = new Map<string, WeeklyPattern[]>();
  for (const p of patterns) {
    const arr = byDay.get(p.day) ?? [];
    arr.push(p);
    byDay.set(p.day, arr);
  }
  const order = ["ma", "di", "wo", "do", "vr", "za", "zo"] as const;
  const lines: string[] = [];
  for (const day of order) {
    const rows = byDay.get(day);
    if (!rows || rows.length === 0) continue;
    const desc = rows
      .map((r) => {
        const p = projecten.find((x) => x.id === r.project_id);
        return `${r.hours}u ${p?.naam ?? "?"}`;
      })
      .join(" + ");
    lines.push(`${WEEK_DAY_LABELS[day]}: ${desc}`);
  }
  return lines.map((l) => `• ${l}`).join("\n");
}
