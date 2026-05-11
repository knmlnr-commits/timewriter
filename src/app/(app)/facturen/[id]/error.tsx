"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FactuurDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Factuur detail crashte:", error);
  }, [error]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Deze factuur kon niet worden geladen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Er ging iets mis bij het tonen van deze factuur. Meestal is dat een
            ontbrekend veld in de data (bv. BTW-percentage of vervaldatum dat
            nooit is ingevuld) waardoor de berekening kapot ging.
          </p>
          {error.digest ? (
            <p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
              Referentie: {error.digest}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Wat je kunt doen:
          </p>
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
            <li>
              Controleer dat de klant een BTW-percentage en betaaltermijn
              heeft staan onder <Link href="/klanten" className="underline">Klanten</Link>.
            </li>
            <li>
              Probeer de factuur opnieuw te laden met de knop hieronder.
            </li>
            <li>
              Lukt het niet, verwijder deze factuur via de actie-knoppen op de
              detailpagina (zodra die weer laadt) en maak een nieuwe aan.
            </li>
          </ul>
          <div className="flex gap-2 pt-2">
            <Button onClick={reset}>Opnieuw proberen</Button>
            <Button asChild variant="outline">
              <Link href="/facturen">Terug naar overzicht</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
