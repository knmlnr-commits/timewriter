import Link from "next/link";
import { Settings2, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listProjecten } from "@/lib/repo/projecten";
import { listKlanten } from "@/lib/repo/klanten";
import { getDefaultWeek } from "@/lib/repo/default-week";
import { Button } from "@/components/ui/button";
import { ChatUI } from "./chat-ui";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await requireUser();
  const [projecten, klanten, defaultWeek] = await Promise.all([
    listProjecten(user.id),
    listKlanten(user.id),
    getDefaultWeek(user.id),
  ]);

  const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--brand)]" />
            Chat
          </h1>
          <p className="text-sm text-muted-foreground">
            Vertel kort wat je deze week deed. De assistent vult je uren in.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/uren/patroon">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Standaard week</span>
          </Link>
        </Button>
      </header>

      <ChatUI
        projecten={projecten.filter((p) => !p.archief)}
        klanten={klanten}
        defaultWeek={defaultWeek}
        userName={user.profile.naam}
        aiConfigured={aiConfigured}
      />
    </div>
  );
}
