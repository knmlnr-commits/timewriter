import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listProjecten } from "@/lib/repo/projecten";
import { listKlanten } from "@/lib/repo/klanten";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IcsImporter } from "./importer";
import { TextImporter } from "./text-importer";

export default async function ImportPage() {
  const user = await requireUser();
  const [projecten, klanten] = await Promise.all([
    listProjecten(user.id),
    listKlanten(user.id),
  ]);
  const actieveProjecten = projecten.filter((p) => !p.archief);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/uren"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Uren importeren</h1>
          <p className="text-sm text-muted-foreground">
            Plak een tabel of upload een .ics-bestand uit Outlook.
          </p>
        </div>
      </div>

      <Tabs defaultValue="tekst">
        <TabsList>
          <TabsTrigger value="tekst">Tekst plakken</TabsTrigger>
          <TabsTrigger value="ics">.ics-bestand</TabsTrigger>
        </TabsList>
        <TabsContent value="tekst" className="mt-4">
          <TextImporter projecten={actieveProjecten} klanten={klanten} />
        </TabsContent>
        <TabsContent value="ics" className="mt-4">
          <IcsImporter projecten={actieveProjecten} klanten={klanten} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
