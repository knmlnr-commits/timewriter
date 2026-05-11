import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { getKv } from "@/lib/kv";
import { KEYS } from "@/lib/keys";

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = "tw_session";
export const SESSION_TTL_SEC = 30 * 24 * 3600;

export type Profile = {
  naam: string;
  accent_kleur: string;
  standaard_uurtarief: number | null;
  factuur_naam: string;
  factuur_adres: string;
  factuur_postcode: string;
  factuur_plaats: string;
  kvk_nummer: string;
  btw_nummer: string;
  iban: string;
  factuur_voettekst: string;
  volgend_factuurnummer: number;
  factuurnummer_prefix: string;
  voltooid: boolean;
};

export type UserRecord = {
  id: string;
  email: string;
  password_salt: string;
  password_hash: string;
  profile: Profile;
  created_at: string;
  updated_at: string;
};

export type SessionRecord = {
  token: string;
  user_id: string;
  created_at: string;
  user_agent?: string;
};

export type SessionUser = Pick<UserRecord, "id" | "email" | "profile">;

function defaultProfile(naam: string): Profile {
  return {
    naam,
    accent_kleur: "#E8732A",
    standaard_uurtarief: null,
    factuur_naam: naam,
    factuur_adres: "",
    factuur_postcode: "",
    factuur_plaats: "",
    kvk_nummer: "",
    btw_nummer: "",
    iban: "",
    factuur_voettekst: "",
    volgend_factuurnummer: 1,
    factuurnummer_prefix: `${new Date().getFullYear()}-`,
    voltooid: false,
  };
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return buf.toString("hex");
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const candidate = (await scryptAsync(password, salt, 64)) as Buffer;
  const target = Buffer.from(hash, "hex");
  if (candidate.length !== target.length) return false;
  return timingSafeEqual(candidate, target);
}

function newToken(): string {
  return randomBytes(32).toString("hex");
}

export async function isSignupAllowed(email: string): Promise<{ allowed: boolean; reason?: string; bootstrap?: boolean }> {
  const kv = getKv();
  if (kv.driver === "absent") return { allowed: false, reason: "KV niet geconfigureerd." };

  const normalized = email.trim().toLowerCase();
  const allow = process.env.SIGNUP_ALLOWLIST?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  // Bootstrap: when the system has zero users we always allow the first signup
  // so the owner can claim the environment. After that, signup is closed unless
  // an explicit allowlist is configured.
  const userIds = await kv.smembers(KEYS.usersIndex());
  if (userIds.length === 0) return { allowed: true, bootstrap: true };

  if (allow && allow.length > 0) {
    if (allow.includes(normalized)) return { allowed: true };
    return { allowed: false, reason: "Dit e-mailadres staat niet op de toegestane lijst." };
  }

  return {
    allowed: false,
    reason: "Aanmaken van nieuwe accounts is uitgeschakeld op deze omgeving. Vraag de beheerder om een uitnodiging.",
  };
}

export async function signup(opts: {
  email: string;
  password: string;
  naam: string;
}): Promise<{ user: UserRecord; token: string }> {
  const kv = getKv();
  const email = opts.email.trim().toLowerCase();
  if (!email || !opts.password || opts.password.length < 8) {
    throw new Error("E-mail en wachtwoord (min. 8 tekens) zijn verplicht.");
  }
  const existing = await kv.get<string>(KEYS.userByEmail(email));
  if (existing) throw new Error("Er bestaat al een account met dit e-mailadres.");

  const gate = await isSignupAllowed(email);
  if (!gate.allowed) throw new Error(gate.reason ?? "Aanmaken is niet toegestaan.");

  const id = randomUUID();
  const salt = randomBytes(16).toString("hex");
  const hash = await hashPassword(opts.password, salt);
  const now = new Date().toISOString();
  const user: UserRecord = {
    id,
    email,
    password_salt: salt,
    password_hash: hash,
    profile: defaultProfile(opts.naam.trim()),
    created_at: now,
    updated_at: now,
  };
  await kv.set(KEYS.user(id), user);
  await kv.set(KEYS.userByEmail(email), id);
  await kv.sadd(KEYS.usersIndex(), id);

  const token = await createSession(id);
  return { user, token };
}

export async function login(email: string, password: string): Promise<string> {
  const kv = getKv();
  const normalized = email.trim().toLowerCase();
  const uid = await kv.get<string>(KEYS.userByEmail(normalized));
  if (!uid) throw new Error("Onbekend e-mailadres of wachtwoord.");
  const user = await kv.get<UserRecord>(KEYS.user(uid));
  if (!user) throw new Error("Onbekend e-mailadres of wachtwoord.");
  const ok = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!ok) throw new Error("Onbekend e-mailadres of wachtwoord.");
  return await createSession(user.id);
}

export async function createSession(userId: string): Promise<string> {
  const kv = getKv();
  const token = newToken();
  const record: SessionRecord = {
    token,
    user_id: userId,
    created_at: new Date().toISOString(),
  };
  await kv.set(KEYS.session(token), record, { ex: SESSION_TTL_SEC });
  await kv.sadd(KEYS.userSessionsIndex(userId), token);
  return token;
}

export async function destroySession(token: string): Promise<void> {
  const kv = getKv();
  const session = await kv.get<SessionRecord>(KEYS.session(token));
  if (session) {
    await kv.srem(KEYS.userSessionsIndex(session.user_id), token);
  }
  await kv.del(KEYS.session(token));
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const kv = getKv();
    if (kv.driver === "absent") return null;
    const session = await kv.get<SessionRecord>(KEYS.session(token));
    if (!session) return null;
    const user = await kv.get<UserRecord>(KEYS.user(session.user_id));
    if (!user) return null;
    return { id: user.id, email: user.email, profile: user.profile };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function getUserRecord(uid: string): Promise<UserRecord | null> {
  return getKv().get<UserRecord>(KEYS.user(uid));
}

export async function updateProfile(uid: string, patch: Partial<Profile>): Promise<UserRecord> {
  const kv = getKv();
  const user = await kv.get<UserRecord>(KEYS.user(uid));
  if (!user) throw new Error("Gebruiker niet gevonden.");
  const next: UserRecord = {
    ...user,
    profile: { ...user.profile, ...patch },
    updated_at: new Date().toISOString(),
  };
  await kv.set(KEYS.user(uid), next);
  return next;
}

export async function changePassword(uid: string, newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Wachtwoord moet minimaal 8 tekens zijn.");
  }
  const kv = getKv();
  const user = await kv.get<UserRecord>(KEYS.user(uid));
  if (!user) throw new Error("Gebruiker niet gevonden.");
  const salt = randomBytes(16).toString("hex");
  const hash = await hashPassword(newPassword, salt);
  const next: UserRecord = {
    ...user,
    password_salt: salt,
    password_hash: hash,
    updated_at: new Date().toISOString(),
  };
  await kv.set(KEYS.user(uid), next);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
