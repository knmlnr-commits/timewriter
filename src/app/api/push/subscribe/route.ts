import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addPushSubscription } from "@/lib/repo/push-subscriptions";

export const dynamic = "force-dynamic";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(req: Request) {
  const user = await requireUser();
  try {
    const body = schema.parse(await req.json());
    const ua = req.headers.get("user-agent") ?? "";
    const record = await addPushSubscription(user.id, {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: ua,
    });
    return NextResponse.json({ ok: true, id: record.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." },
      { status: 400 }
    );
  }
}
