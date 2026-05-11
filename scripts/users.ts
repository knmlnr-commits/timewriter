#!/usr/bin/env tsx
/**
 * Admin CLI voor gebruikersbeheer.
 *
 *   pnpm tsx scripts/users.ts list
 *   pnpm tsx scripts/users.ts find <email-of-substring>
 *   pnpm tsx scripts/users.ts delete <email>
 *
 * Werkt rechtstreeks tegen je productie-KV (REDIS_URL of
 * KV_REST_API_URL+TOKEN). Leest env in via .env.local of .env.
 *
 * Bewust standalone: importeert geen Next-modules met `import "server-only"`,
 * zodat het script onder tsx draait zonder Next bundler.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { KEYS } from "../src/lib/keys";

function loadDotEnv(file: string) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, k, rawV] = m;
    let v = rawV;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadDotEnv(path.resolve(process.cwd(), ".env.local"));
loadDotEnv(path.resolve(process.cwd(), ".env"));

type Kv = {
  get<T = unknown>(key: string): Promise<T | null>;
  del(...keys: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  mget<T = unknown>(...keys: string[]): Promise<(T | null)[]>;
  close(): Promise<void>;
};

function deser<T>(v: string | null | undefined): T | null {
  if (v === null || v === undefined) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return v as unknown as T;
  }
}

async function makeKv(): Promise<Kv> {
  if (process.env.REDIS_URL) {
    const { createClient } = await import("redis");
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    return {
      async get(key) {
        return deser(await client.get(key)) as never;
      },
      async del(...keys) {
        if (keys.length === 0) return 0;
        return Number(await client.del(keys));
      },
      async sadd(key, ...members) {
        if (members.length === 0) return 0;
        return Number(await client.sAdd(key, members));
      },
      async srem(key, ...members) {
        if (members.length === 0) return 0;
        return Number(await client.sRem(key, members));
      },
      async smembers(key) {
        return (await client.sMembers(key)) as string[];
      },
      async mget<T>(...keys: string[]) {
        if (keys.length === 0) return [];
        const raw = (await client.mGet(keys)) as (string | null)[];
        return raw.map((v) => deser<T>(v));
      },
      async close() {
        await client.quit();
      },
    };
  }
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { Redis } = await import("@upstash/redis");
    const r = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    return {
      async get(key) {
        return (await r.get(key)) as never;
      },
      async del(...keys) {
        if (keys.length === 0) return 0;
        return (await r.del(...keys)) as number;
      },
      async sadd(key, ...members) {
        if (members.length === 0) return 0;
        return (await r.sadd(key, members[0], ...members.slice(1))) as number;
      },
      async srem(key, ...members) {
        if (members.length === 0) return 0;
        return (await r.srem(key, members[0], ...members.slice(1))) as number;
      },
      async smembers(key) {
        return (await r.smembers(key)) as string[];
      },
      async mget<T>(...keys: string[]) {
        if (keys.length === 0) return [];
        return (await r.mget<T[]>(...keys)) as (T | null)[];
      },
      async close() {},
    };
  }
  console.error(
    "FOUT: geen KV geconfigureerd. Zet KV_REST_API_URL+TOKEN of REDIS_URL in .env.local of in de omgeving."
  );
  process.exit(2);
}

type User = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  profile: { naam: string; voltooid: boolean };
};

async function listUsers(kv: Kv): Promise<User[]> {
  const ids = await kv.smembers(KEYS.usersIndex());
  if (ids.length === 0) return [];
  const rows = await kv.mget<User>(...ids.map((id) => KEYS.user(id)));
  return rows.filter((u): u is User => Boolean(u));
}

function fmt(u: User): string {
  const status = u.profile.voltooid ? "voltooid" : "onboarding";
  return [
    u.email.padEnd(36),
    (u.profile.naam || "").padEnd(24),
    status.padEnd(11),
    u.created_at.slice(0, 10),
    u.id,
  ].join("  ");
}

function header() {
  console.log(
    ["email", "naam", "status", "gemaakt", "id"]
      .map((h, i) => h.padEnd([36, 24, 11, 10, 36][i]))
      .join("  ")
  );
  console.log("-".repeat(120));
}

async function cmdList(kv: Kv) {
  const users = await listUsers(kv);
  if (users.length === 0) {
    console.log("Geen gebruikers gevonden.");
    return;
  }
  header();
  for (const u of users.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    console.log(fmt(u));
  }
  console.log(`\n${users.length} gebruiker(s) totaal.`);
}

async function cmdFind(kv: Kv, query: string) {
  if (!query) {
    console.error("Geef een zoekterm (e-mail of naam-substring).");
    process.exit(2);
  }
  const q = query.toLowerCase();
  const users = await listUsers(kv);
  const hits = users.filter(
    (u) =>
      u.email.toLowerCase().includes(q) ||
      (u.profile.naam || "").toLowerCase().includes(q)
  );
  if (hits.length === 0) {
    console.log(`Geen treffers voor "${query}".`);
    return;
  }
  header();
  for (const u of hits) console.log(fmt(u));
  console.log(`\n${hits.length} treffer(s).`);
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function cmdDelete(kv: Kv, email: string) {
  if (!email) {
    console.error("Geef het e-mailadres van het te verwijderen account.");
    process.exit(2);
  }
  const normalized = email.trim().toLowerCase();
  const uid = await kv.get<string>(KEYS.userByEmail(normalized));
  if (!uid) {
    console.error(`Geen gebruiker met e-mail "${normalized}".`);
    process.exit(1);
  }
  const user = await kv.get<User>(KEYS.user(uid));
  console.log("Op het punt te verwijderen:");
  console.log(`  e-mail:   ${user?.email ?? normalized}`);
  console.log(`  naam:     ${user?.profile.naam ?? "?"}`);
  console.log(`  user_id:  ${uid}`);
  console.log(`  gemaakt:  ${user?.created_at ?? "?"}`);
  console.log(
    "\nDit verwijdert het account en alle sessies. Klant- en factuurdata in KV\n" +
      "(per-user keys onder dit user_id) blijven staan maar zijn niet meer benaderbaar."
  );

  const answer = await prompt('Type "JA" om door te gaan: ');
  if (answer !== "JA") {
    console.log("Geannuleerd.");
    return;
  }

  const sessions = await kv.smembers(KEYS.userSessionsIndex(uid));
  for (const token of sessions) {
    await kv.del(KEYS.session(token));
  }
  await kv.del(KEYS.userSessionsIndex(uid));
  await kv.del(KEYS.user(uid));
  await kv.del(KEYS.userByEmail(normalized));
  await kv.srem(KEYS.usersIndex(), uid);

  console.log(`\nVerwijderd: ${normalized} (${sessions.length} sessie(s) gerevoceerd).`);
}

async function main() {
  const [, , subcommand, ...rest] = process.argv;
  if (!subcommand || !["list", "find", "delete"].includes(subcommand)) {
    console.log(
      [
        "Gebruik:",
        "  pnpm tsx scripts/users.ts list                  # toon alle accounts",
        "  pnpm tsx scripts/users.ts find <zoekterm>        # zoek op e-mail of naam",
        "  pnpm tsx scripts/users.ts delete <email>         # verwijder account + sessies",
      ].join("\n")
    );
    process.exit(subcommand ? 2 : 0);
  }
  const kv = await makeKv();
  try {
    switch (subcommand) {
      case "list":
        await cmdList(kv);
        break;
      case "find":
        await cmdFind(kv, rest.join(" "));
        break;
      case "delete":
        await cmdDelete(kv, rest[0] ?? "");
        break;
    }
  } finally {
    await kv.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
