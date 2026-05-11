import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { listProjecten } from "@/lib/repo/projecten";
import { listKlanten } from "@/lib/repo/klanten";
import { getDefaultWeek } from "@/lib/repo/default-week";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { PROPOSE_ENTRIES_TOOL } from "@/lib/ai/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([
    z.string(),
    z.array(
      z.object({
        type: z.literal("text"),
        text: z.string(),
      })
    ),
  ]),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1),
});

const DEFAULT_MODEL = "claude-opus-4-7";

type ProposedEntry = {
  datum: string;
  project_id: string;
  uren: number;
  omschrijving?: string;
};

type ChatResponse =
  | { kind: "text"; text: string; stop_reason: string | null }
  | {
      kind: "proposal";
      text: string;
      samenvatting: string;
      entries: ProposedEntry[];
      stop_reason: string | null;
    }
  | { kind: "error"; error: string };

export async function POST(req: Request): Promise<NextResponse<ChatResponse>> {
  const user = await requireUser();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { kind: "error", error: "Chat-assistent is niet geconfigureerd. Vraag de beheerder om ANTHROPIC_API_KEY te zetten." },
      { status: 503 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { kind: "error", error: e instanceof Error ? e.message : "Ongeldige invoer." },
      { status: 400 }
    );
  }

  const [projecten, klanten, defaultWeek] = await Promise.all([
    listProjecten(user.id),
    listKlanten(user.id),
    getDefaultWeek(user.id),
  ]);

  const system = buildSystemPrompt({
    naam: user.profile.naam,
    projecten,
    klanten,
    defaultWeek,
  });

  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system,
      tools: [PROPOSE_ENTRIES_TOOL],
      messages: body.messages,
    });

    let textOut = "";
    let toolCall: { samenvatting: string; entries: ProposedEntry[] } | null = null;

    for (const block of response.content) {
      if (block.type === "text") {
        textOut += block.text;
      } else if (block.type === "tool_use" && block.name === "propose_entries") {
        const input = block.input as {
          samenvatting?: string;
          entries?: ProposedEntry[];
        };
        if (Array.isArray(input?.entries)) {
          // Defensief filteren op geldige projecten
          const validIds = new Set(projecten.map((p) => p.id));
          const entries = input.entries.filter(
            (e) =>
              typeof e.datum === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(e.datum) &&
              typeof e.uren === "number" &&
              e.uren > 0 &&
              e.uren <= 24 &&
              validIds.has(e.project_id)
          );
          toolCall = {
            samenvatting: input.samenvatting ?? "",
            entries,
          };
        }
      }
    }

    if (toolCall && toolCall.entries.length > 0) {
      return NextResponse.json({
        kind: "proposal",
        text: textOut.trim(),
        samenvatting: toolCall.samenvatting,
        entries: toolCall.entries,
        stop_reason: response.stop_reason,
      });
    }

    return NextResponse.json({
      kind: "text",
      text: textOut.trim() || "Geen reactie ontvangen.",
      stop_reason: response.stop_reason,
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { kind: "error", error: "Anthropic API key is ongeldig. Controleer ANTHROPIC_API_KEY." },
        { status: 401 }
      );
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { kind: "error", error: "Te veel aanvragen op de chat-assistent. Wacht even." },
        { status: 429 }
      );
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json(
        { kind: "error", error: `Anthropic API fout (${e.status}): ${e.message}` },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { kind: "error", error: e instanceof Error ? e.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
