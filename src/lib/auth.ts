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
  factuur_website: string;
  factuur_telefoon: string;
  /** Logo voor op de factuur. Base64 data URL (PNG/JPG/SVG), max ~150KB encoded. Leeg = geen logo. */
  factuur_logo_data: string;
  volgend_factuurnummer: number;
  factuurnummer_prefix: string;
  voltooid: boolean;
  is_admin: boolean;
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

function defaultProfile(naam: string, isAdmin: boolean = false): Profile {
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
    factuur_website: "",
    factuur_telefoon: "",
    factuur_logo_data: "",
    volgend_factuurnummer: 1,
    factuurnummer_prefix: `${new Date().getFullYear()}-`,
    voltooid: false,
    is_admin: isAdmin,
  };
}

function adminEmailOverrides(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Een gebruiker is admin als profile.is_admin === true of als hun e-mail in
 * ADMIN_EMAILS staat. De env-override fungeert als noodingang om jezelf
 * weer als admin te kunnen aanmerken zonder KV-edit.
 */
export function isAdmin(user: { email: string; profile: Pick<Profile, "is_admin"> }): boolean {
  if (user.profile.is_admin) return true;
  const overrides = adminEmailOverrides();
  return overrides.includes(user.email.toLowerCase());
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

/**
 * Publieke signup is alleen toegestaan als bootstrap: er zijn nog geen
 * gebruikers in KV. Daarna is /signup dicht en moet de beheerder via
 * /admin nieuwe accounts aanmaken.
 */
export async function isBootstrapAvailable(): Promise<boolean> {
  const kv = getKv();
  if (kv.driver === "absent") return false;
  const userIds = await kv.smembers(KEYS.usersIndex());
  return userIds.length === 0;
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

  if (!(await isBootstrapAvailable())) {
    throw new Error("Aanmaken van nieuwe accounts is alleen mogelijk via de beheerder.");
  }

  // Bootstrap: eerste account is automatisch beheerder en claimt de omgeving.
  const id = randomUUID();
  const salt = randomBytes(16).toString("hex");
  const hash = await hashPassword(opts.password, salt);
  const now = new Date().toISOString();
  const user: UserRecord = {
    id,
    email,
    password_salt: salt,
    password_hash: hash,
    profile: defaultProfile(opts.naam.trim(), true),
    created_at: now,
    updated_at: now,
  };
  await kv.set(KEYS.user(id), user);
  await kv.set(KEYS.userByEmail(email), id);
  await kv.sadd(KEYS.usersIndex(), id);

  const token = await createSession(id);
  return { user, token };
}

/**
 * Door beheerder uitgevoerde account-aanmaak. Geen sessie wordt aangemaakt;
 * de nieuwe gebruiker logt zelf in met de meegegeven credentials.
 */
export async function adminCreateUser(opts: {
  email: string;
  password: string;
  naam: string;
  is_admin?: boolean;
}): Promise<UserRecord> {
  const kv = getKv();
  if (kv.driver === "absent") throw new Error("KV niet geconfigureerd.");
  const email = opts.email.trim().toLowerCase();
  if (!email || !/^.+@.+\..+$/.test(email)) throw new Error("Ongeldig e-mailadres.");
  if (!opts.password || opts.password.length < 8) {
    throw new Error("Wachtwoord moet minimaal 8 tekens zijn.");
  }
  if (!opts.naam.trim()) throw new Error("Naam is verplicht.");

  const existing = await kv.get<string>(KEYS.userByEmail(email));
  if (existing) throw new Error("Er bestaat al een account met dit e-mailadres.");

  const id = randomUUID();
  const salt = randomBytes(16).toString("hex");
  const hash = await hashPassword(opts.password, salt);
  const now = new Date().toISOString();
  const user: UserRecord = {
    id,
    email,
    password_salt: salt,
    password_hash: hash,
    profile: defaultProfile(opts.naam.trim(), Boolean(opts.is_admin)),
    created_at: now,
    updated_at: now,
  };
  await kv.set(KEYS.user(id), user);
  await kv.set(KEYS.userByEmail(email), id);
  await kv.sadd(KEYS.usersIndex(), id);
  return user;
}

export async function adminListUsers(): Promise<UserRecord[]> {
  const kv = getKv();
  const ids = await kv.smembers(KEYS.usersIndex());
  if (ids.length === 0) return [];
  const rows = await kv.mget<UserRecord>(...ids.map((id) => KEYS.user(id)));
  return rows
    .filter((u): u is UserRecord => Boolean(u))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const kv = getKv();
  const user = await kv.get<UserRecord>(KEYS.user(userId));
  if (!user) throw new Error("Gebruiker niet gevonden.");
  const sessions = await kv.smembers(KEYS.userSessionsIndex(userId));
  for (const token of sessions) await kv.del(KEYS.session(token));
  await kv.del(KEYS.userSessionsIndex(userId));
  await kv.del(KEYS.user(userId));
  await kv.del(KEYS.userByEmail(user.email));
  await kv.srem(KEYS.usersIndex(), userId);
}

export async function adminSetAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const kv = getKv();
  const user = await kv.get<UserRecord>(KEYS.user(userId));
  if (!user) throw new Error("Gebruiker niet gevonden.");
  const next: UserRecord = {
    ...user,
    profile: { ...user.profile, is_admin: isAdmin },
    updated_at: new Date().toISOString(),
  };
  await kv.set(KEYS.user(userId), next);
}

export async function adminResetPassword(userId: string, newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Wachtwoord moet minimaal 8 tekens zijn.");
  }
  const kv = getKv();
  const user = await kv.get<UserRecord>(KEYS.user(userId));
  if (!user) throw new Error("Gebruiker niet gevonden.");
  const salt = randomBytes(16).toString("hex");
  const hash = await hashPassword(newPassword, salt);
  const sessions = await kv.smembers(KEYS.userSessionsIndex(userId));
  for (const token of sessions) await kv.del(KEYS.session(token));
  await kv.del(KEYS.userSessionsIndex(userId));
  const next: UserRecord = {
    ...user,
    password_salt: salt,
    password_hash: hash,
    updated_at: new Date().toISOString(),
  };
  await kv.set(KEYS.user(userId), next);
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
    // Defensief: oude records zonder is_admin krijgen `false`, en de
    // ADMIN_EMAILS env-override wint daarna alsnog via isAdmin().
    const profile: Profile = { ...user.profile, is_admin: Boolean(user.profile.is_admin) };
    return { id: user.id, email: user.email, profile };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

/**
 * Voorkom dat een wijziging via profile-update per ongeluk is_admin
 * intrekt of toekent: alleen de admin-flows mogen die flag wijzigen.
 */
export async function updateProfileSafe(uid: string, patch: Partial<Profile>): Promise<UserRecord> {
  const { is_admin: _drop, ...veilig } = patch;
  void _drop;
  return updateProfile(uid, veilig);
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

export async function setSessionCookie(
  token: string,
  opts: { persistent?: boolean } = { persistent: true }
) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // persistent=true: cookie blijft 30 dagen ook na browser-close.
    // persistent=false: session cookie — verdwijnt als de browser sluit.
    ...(opts.persistent !== false ? { maxAge: SESSION_TTL_SEC } : {}),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
