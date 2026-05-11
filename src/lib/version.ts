/**
 * Versie van de app. Wordt bij build-time door next.config.ts vanuit
 * package.json in de env geinjecteerd, zodat zowel server- als
 * client-componenten dezelfde waarde zien zonder runtime fs-toegang.
 *
 * Fallback voor het uitzonderlijke geval dat de env-injection niet
 * werkte (bv. tests): "0.0.0-dev".
 */
export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0-dev";
