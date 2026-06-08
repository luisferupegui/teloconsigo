import "server-only";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Usuarios del panel admin. Se guardan en data/admin-users.json (ignorado por
// git) con la contraseña HASHEADA (scrypt + salt por usuario) — nunca en texto
// plano. El primer usuario se siembra desde ADMIN_USER / ADMIN_PASSWORD del .env
// para que el acceso configurado siga funcionando y quede gestionable aquí.

export type AdminUser = {
  username: string;
  salt: string; // hex (16 bytes)
  hash: string; // hex (scrypt, 64 bytes)
  createdAt: string;
};

export type Result = { ok: true } | { ok: false; error: string };

const USERS_FILE = path.join(process.cwd(), "data", "admin-users.json");
const KEYLEN = 64;

export const USERNAME_RE = /^[a-zA-Z0-9._@-]{3,64}$/;
export const MIN_PASSWORD = 8;

// ─── Hashing ────────────────────────────────────────────────────────────────
function deriveHash(password: string, saltHex: string): Buffer {
  return scryptSync(password, Buffer.from(saltHex, "hex"), KEYLEN);
}

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = deriveHash(password, salt).toString("hex");
  return { salt, hash };
}

function passwordMatches(password: string, user: AdminUser): boolean {
  let expected: Buffer;
  try {
    expected = Buffer.from(user.hash, "hex");
  } catch {
    return false;
  }
  const actual = deriveHash(password, user.salt);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// ─── Persistencia ─────────────────────────────────────────────────────────────
function readUsers(): AdminUser[] {
  try {
    if (!existsSync(USERS_FILE)) return [];
    const data = JSON.parse(readFileSync(USERS_FILE, "utf-8"));
    return Array.isArray(data) ? (data as AdminUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: AdminUser[]): void {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

// Siembra el primer usuario desde el .env si el store está vacío. Si el archivo
// se borra por accidente, se vuelve a sembrar al siguiente arranque/login.
function seedFromEnv(users: AdminUser[]): AdminUser[] {
  if (users.length > 0) return users;
  const u = process.env.ADMIN_USER?.trim();
  const p = process.env.ADMIN_PASSWORD;
  if (!u || !p) return users;
  const { salt, hash } = hashPassword(p);
  const seeded: AdminUser[] = [{ username: u, salt, hash, createdAt: new Date().toISOString() }];
  writeUsers(seeded);
  return seeded;
}

export function loadUsers(): AdminUser[] {
  return seedFromEnv(readUsers());
}

function findUser(users: AdminUser[], username: string): AdminUser | undefined {
  const u = username.trim();
  return users.find((x) => x.username === u);
}

// ─── Operaciones públicas ─────────────────────────────────────────────────────
export function listUsers(): { username: string; createdAt: string }[] {
  return loadUsers()
    .map((u) => ({ username: u.username, createdAt: u.createdAt }))
    .sort((a, b) => a.username.localeCompare(b.username));
}

export function hasAnyUser(): boolean {
  return loadUsers().length > 0;
}

export function addUser(username: string, password: string): Result {
  const u = username.trim();
  if (!USERNAME_RE.test(u)) {
    return { ok: false, error: "Usuario inválido (3–64 caracteres: letras, números y . _ - @)." };
  }
  if ((password ?? "").length < MIN_PASSWORD) {
    return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
  }
  const users = loadUsers();
  if (findUser(users, u)) return { ok: false, error: "Ya existe un usuario con ese nombre." };
  const { salt, hash } = hashPassword(password);
  users.push({ username: u, salt, hash, createdAt: new Date().toISOString() });
  writeUsers(users);
  return { ok: true };
}

export function deleteUser(username: string): Result {
  const u = username.trim();
  const users = loadUsers();
  if (!findUser(users, u)) return { ok: false, error: "El usuario no existe." };
  if (users.length <= 1) {
    return { ok: false, error: "No puedes borrar el último usuario (quedarías sin acceso)." };
  }
  writeUsers(users.filter((x) => x.username !== u));
  return { ok: true };
}

export function setPassword(username: string, password: string): Result {
  const u = username.trim();
  if ((password ?? "").length < MIN_PASSWORD) {
    return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
  }
  const users = loadUsers();
  const user = findUser(users, u);
  if (!user) return { ok: false, error: "El usuario no existe." };
  const { salt, hash } = hashPassword(password);
  user.salt = salt;
  user.hash = hash;
  writeUsers(users);
  return { ok: true };
}

export function verifyCredentials(username: string, password: string): boolean {
  const users = loadUsers();
  const user = findUser(users, username);
  if (!user) {
    // Igualar el coste de cómputo aunque el usuario no exista, para no filtrar
    // su existencia por tiempo de respuesta.
    deriveHash(password, "00".repeat(16));
    return false;
  }
  return passwordMatches(password, user);
}
