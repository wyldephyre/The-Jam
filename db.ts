import { Database } from "bun:sqlite";
import type { Platform } from "./auth";

export type Viewer = {
  id: string;
  username: string | null;
  total_minutes: number;
  is_regular: number;
  created_at: string;
  updated_at: string;
};

export type Request = {
  id: string;
  viewer_id: string;
  user_id: string | null;
  type: "song" | "message";
  content: string;
  spotify_uri: string | null;
  artist: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type RequestWithViewer = Request & {
  viewer: { username: string | null; platform: string | null } | null;
};

export type InsertRequestData = {
  viewer_id: string;
  user_id?: string | null;
  type: "song" | "message";
  content: string;
  spotify_uri?: string | null;
  artist?: string | null;
  status: "pending" | "approved" | "rejected";
};

// Account rows are the viewer identity. A future linked_identities table
// (Twitch/YouTube/X OAuth, Rumble verification codes) should reference users.id.
// `platform` here is the self-reported chat platform, not a verified link.
// password_hash is argon2id from Bun.password and is never sent to clients.
export type Account = {
  id: string;
  display_name: string;
  display_name_key: string;
  platform: Platform;
  email: string | null;
  password_hash: string;
  banned: number;
  viewer_id: string;
  created_at: string;
  updated_at: string;
  total_minutes: number;
  is_regular: number;
};

export type PublicAccount = {
  id: string;
  displayName: string;
  platform: Platform;
  email: string | null;
  banned: boolean;
  viewerId: string;
  isRegular: boolean;
  totalMinutes: number;
  createdAt: string;
};

export type CreateAccountInput = {
  displayName: string;
  displayNameKey: string;
  platform: Platform;
  email: string | null;
  passwordHash: string;
};

const SCHEMA_TABLES = new Set(["viewers", "requests", "overlay", "users", "sessions"]);

function tableExists(database: Database, table: string): boolean {
  const row = database.query("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  return !!row;
}

function tableColumns(database: Database, table: string): Set<string> {
  if (!SCHEMA_TABLES.has(table)) throw new Error(`unexpected table ${table}`);
  const rows = database.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((row) => row.name));
}

// Safe to run on every boot and on a database created by an older build.
// Existing viewers and requests are left in place. New columns are nullable.
export function migrateSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS viewers (
      id TEXT PRIMARY KEY,
      username TEXT,
      total_minutes INTEGER DEFAULT 0,
      is_regular INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      viewer_id TEXT,
      user_id TEXT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      spotify_uri TEXT,
      artist TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  if (tableExists(database, "requests") && !tableColumns(database, "requests").has("user_id")) {
    database.run("ALTER TABLE requests ADD COLUMN user_id TEXT");
  }
  database.run(`
    CREATE TABLE IF NOT EXISTS overlay (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content TEXT DEFAULT ''
    )
  `);
  database.run(`INSERT OR IGNORE INTO overlay (id, content) VALUES (1, '')`);
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      display_name_key TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      banned INTEGER NOT NULL DEFAULT 0,
      viewer_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  database.run(`CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_requests_viewer_id ON requests(viewer_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_viewers_is_regular ON viewers(is_regular)`);
  database.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`);
}

const dbPath = process.env.JAM_DB_PATH || "the-jam.db";
export const db = new Database(dbPath);
migrateSchema(db);

function rowToViewer(row: Record<string, unknown>): Viewer {
  return {
    id: row.id as string,
    username: row.username as string | null,
    total_minutes: (row.total_minutes as number) ?? 0,
    is_regular: (row.is_regular as number) ?? 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToRequest(row: Record<string, unknown>): Request {
  return {
    id: row.id as string,
    viewer_id: row.viewer_id as string,
    user_id: (row.user_id as string | null) ?? null,
    type: row.type as "song" | "message",
    content: row.content as string,
    spotify_uri: row.spotify_uri as string | null,
    artist: row.artist as string | null,
    status: row.status as "pending" | "approved" | "rejected",
    created_at: row.created_at as string,
  };
}

const ACCOUNT_COLUMNS = `u.id, u.display_name, u.display_name_key, u.platform, u.email, u.password_hash,
  u.banned, u.viewer_id, u.created_at, u.updated_at,
  COALESCE(v.total_minutes, 0) AS total_minutes, COALESCE(v.is_regular, 0) AS is_regular`;

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    display_name: row.display_name as string,
    display_name_key: row.display_name_key as string,
    platform: row.platform as Platform,
    email: (row.email as string | null) ?? null,
    password_hash: row.password_hash as string,
    banned: (row.banned as number) ?? 0,
    viewer_id: row.viewer_id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    total_minutes: (row.total_minutes as number) ?? 0,
    is_regular: (row.is_regular as number) ?? 0,
  };
}

export function toPublicAccount(account: Account): PublicAccount {
  return {
    id: account.id,
    displayName: account.display_name,
    platform: account.platform,
    email: account.email,
    banned: Boolean(account.banned),
    viewerId: account.viewer_id,
    isRegular: Boolean(account.is_regular),
    totalMinutes: account.total_minutes,
    createdAt: account.created_at,
  };
}

function requestSelect(where: string): string {
  return `SELECT r.*, COALESCE(u.display_name, v.username) AS viewer_username, u.platform AS viewer_platform
    FROM requests r
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN viewers v ON v.id = r.viewer_id
    ${where}`;
}

function withViewer(row: Record<string, unknown>): RequestWithViewer {
  return {
    ...rowToRequest(row),
    viewer: {
      username: (row.viewer_username as string | null) ?? null,
      platform: (row.viewer_platform as string | null) ?? null,
    },
  };
}

export function getViewer(id: string): Viewer | null {
  const row = db.query("SELECT * FROM viewers WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToViewer(row);
}

export function upsertViewer(id: string, minutesToAdd: number, threshold: number): Viewer {
  db.run("INSERT OR IGNORE INTO viewers (id, total_minutes) VALUES (?, 0)", [id]);
  const before = db.query("SELECT * FROM viewers WHERE id = ?").get(id) as Record<string, unknown>;
  const newMinutes = (before.total_minutes as number) + minutesToAdd;
  const shouldBeRegular = newMinutes >= threshold ? 1 : 0;
  const isRegular = Math.max((before.is_regular as number) ?? 0, shouldBeRegular);
  db.run(
    "UPDATE viewers SET total_minutes = ?, is_regular = ?, updated_at = datetime('now') WHERE id = ?",
    [newMinutes, isRegular, id]
  );
  const row = db.query("SELECT * FROM viewers WHERE id = ?").get(id) as Record<string, unknown>;
  return rowToViewer(row);
}

export function setViewerUsername(id: string, username: string): Viewer {
  db.run("INSERT OR IGNORE INTO viewers (id, total_minutes) VALUES (?, 0)", [id]);
  db.run("UPDATE viewers SET username = ?, updated_at = datetime('now') WHERE id = ?", [username, id]);
  const row = db.query("SELECT * FROM viewers WHERE id = ?").get(id) as Record<string, unknown>;
  return rowToViewer(row);
}

export function getAllViewers(): Viewer[] {
  const rows = db.query("SELECT * FROM viewers ORDER BY total_minutes DESC").all() as Record<string, unknown>[];
  return rows.map(rowToViewer);
}

export function toggleViewerRegular(id: string): Viewer | null {
  const row = db.query("SELECT is_regular FROM viewers WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const next = (row.is_regular as number) ? 0 : 1;
  db.run("UPDATE viewers SET is_regular = ?, updated_at = datetime('now') WHERE id = ?", [next, id]);
  const updated = db.query("SELECT * FROM viewers WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!updated) return null;
  return rowToViewer(updated);
}

export function getRequests(status?: string): RequestWithViewer[] {
  const sql = status ? requestSelect("WHERE r.status = ? ORDER BY r.created_at DESC") : requestSelect("ORDER BY r.created_at DESC");
  const rows = (status ? db.query(sql).all(status) : db.query(sql).all()) as Record<string, unknown>[];
  return rows.map(withViewer);
}

export function getRequest(id: string): RequestWithViewer | null {
  const row = db.query(requestSelect("WHERE r.id = ?")).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return withViewer(row);
}

export function getApprovedRequests(limit = 50): RequestWithViewer[] {
  const rows = db.query(requestSelect("WHERE r.status = 'approved' ORDER BY r.created_at DESC LIMIT ?")).all(limit) as Record<
    string,
    unknown
  >[];
  return rows.map(withViewer);
}

export function insertRequest(data: InsertRequestData): RequestWithViewer {
  const id = crypto.randomUUID();
  db.run(
    "INSERT INTO requests (id, viewer_id, user_id, type, content, spotify_uri, artist, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      data.viewer_id,
      data.user_id ?? null,
      data.type,
      data.content,
      data.spotify_uri ?? null,
      data.artist ?? null,
      data.status,
    ]
  );
  const out = getRequest(id);
  if (!out) throw new Error("insertRequest: getRequest returned null");
  return out;
}

export function updateRequestStatus(id: string, status: string): void {
  db.run("UPDATE requests SET status = ? WHERE id = ?", [status, id]);
}

export function getApprovedSongCredits(): { uri: string; requester: string | null }[] {
  const rows = db
    .query(
      `SELECT r.spotify_uri AS uri, COALESCE(u.display_name, v.username) AS requester
       FROM requests r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN viewers v ON v.id = r.viewer_id
       WHERE r.type = 'song' AND r.status = 'approved' AND r.spotify_uri IS NOT NULL AND r.spotify_uri != ''
       ORDER BY r.created_at DESC`
    )
    .all() as { uri: string; requester: string | null }[];
  return rows.map((row) => ({ uri: row.uri, requester: row.requester ?? null }));
}

export function getOverlay(): string {
  const row = db.query("SELECT content FROM overlay WHERE id = 1").get() as { content: string } | undefined;
  return row?.content ?? "";
}

export function setOverlay(content: string): void {
  db.run("UPDATE overlay SET content = ? WHERE id = 1", [content]);
}

export function clearOverlay(): void {
  db.run("UPDATE overlay SET content = '' WHERE id = 1");
}

export function createAccount(
  input: CreateAccountInput
): { ok: true; account: Account } | { ok: false; reason: "name" | "email" } {
  const id = crypto.randomUUID();
  try {
    const insert = db.transaction(() => {
      db.run("INSERT INTO viewers (id, username, total_minutes) VALUES (?, ?, 0)", [id, input.displayName]);
      db.run(
        `INSERT INTO users (id, display_name, display_name_key, platform, email, password_hash, banned, viewer_id)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [id, input.displayName, input.displayNameKey, input.platform, input.email, input.passwordHash, id]
      );
    });
    insert();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("users.email") || message.includes("idx_users_email")) return { ok: false, reason: "email" };
    if (message.includes("UNIQUE")) return { ok: false, reason: "name" };
    throw error;
  }
  const account = getAccount(id);
  if (!account) throw new Error("createAccount: account missing");
  return { ok: true, account };
}

export function getAccount(id: string): Account | null {
  const row = db
    .query(`SELECT ${ACCOUNT_COLUMNS} FROM users u LEFT JOIN viewers v ON v.id = u.viewer_id WHERE u.id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToAccount(row) : null;
}

export function getAccountByNameKey(key: string): Account | null {
  const row = db
    .query(`SELECT ${ACCOUNT_COLUMNS} FROM users u LEFT JOIN viewers v ON v.id = u.viewer_id WHERE u.display_name_key = ?`)
    .get(key) as Record<string, unknown> | undefined;
  return row ? rowToAccount(row) : null;
}

export function getAccountBySessionHash(sessionHash: string, nowSeconds: number): Account | null {
  const row = db
    .query(
      `SELECT ${ACCOUNT_COLUMNS}
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN viewers v ON v.id = u.viewer_id
       WHERE s.id = ? AND s.expires_at > ?`
    )
    .get(sessionHash, nowSeconds) as Record<string, unknown> | undefined;
  return row ? rowToAccount(row) : null;
}

export function insertSession(sessionHash: string, userId: string, expiresAt: number): void {
  db.run("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", [sessionHash, userId, expiresAt]);
}

export function deleteSessionByHash(sessionHash: string): void {
  db.run("DELETE FROM sessions WHERE id = ?", [sessionHash]);
}

export function deleteSessionsForUser(userId: string): void {
  db.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
}

export function purgeExpiredSessions(nowSeconds: number): void {
  db.run("DELETE FROM sessions WHERE expires_at <= ?", [nowSeconds]);
}

export function listAccounts(): PublicAccount[] {
  const rows = db
    .query(
      `SELECT u.id, u.display_name, u.platform, u.email, u.banned, u.viewer_id, u.created_at,
              COALESCE(v.total_minutes, 0) AS total_minutes, COALESCE(v.is_regular, 0) AS is_regular
       FROM users u
       LEFT JOIN viewers v ON v.id = u.viewer_id
       ORDER BY u.created_at DESC`
    )
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    id: row.id as string,
    displayName: row.display_name as string,
    platform: row.platform as Platform,
    email: (row.email as string | null) ?? null,
    banned: Boolean(row.banned),
    viewerId: row.viewer_id as string,
    isRegular: Boolean(row.is_regular),
    totalMinutes: (row.total_minutes as number) ?? 0,
    createdAt: row.created_at as string,
  }));
}

export function setAccountBanned(id: string, banned: boolean): PublicAccount | null {
  const existing = getAccount(id);
  if (!existing) return null;
  db.run("UPDATE users SET banned = ?, updated_at = datetime('now') WHERE id = ?", [banned ? 1 : 0, id]);
  if (banned) deleteSessionsForUser(id);
  const updated = getAccount(id);
  return updated ? toPublicAccount(updated) : null;
}

// Removes the login. The loyalty viewer row stays so older requests still
// show the display name through requests.viewer_id.
export function deleteAccount(id: string): boolean {
  const existing = getAccount(id);
  if (!existing) return false;
  db.run("DELETE FROM sessions WHERE user_id = ?", [id]);
  db.run("DELETE FROM users WHERE id = ?", [id]);
  return true;
}
