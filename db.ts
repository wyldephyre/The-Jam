import { Database } from "bun:sqlite";

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
  type: "song" | "message";
  content: string;
  spotify_uri: string | null;
  artist: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type RequestWithViewer = Request & {
  viewer: { username: string | null } | null;
};

export type InsertRequestData = {
  viewer_id: string;
  type: "song" | "message";
  content: string;
  spotify_uri?: string | null;
  artist?: string | null;
  status: "pending" | "approved" | "rejected";
};

export const db = new Database("the-jam.db");

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS viewers (
      id TEXT PRIMARY KEY,
      username TEXT,
      total_minutes INTEGER DEFAULT 0,
      is_regular INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      viewer_id TEXT REFERENCES viewers(id),
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      spotify_uri TEXT,
      artist TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS overlay (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content TEXT DEFAULT ''
    )
  `);
  db.run(`INSERT OR IGNORE INTO overlay (id, content) VALUES (1, '')`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_requests_viewer_id ON requests(viewer_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_viewers_is_regular ON viewers(is_regular)`);
}
initSchema();

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
    type: row.type as "song" | "message",
    content: row.content as string,
    spotify_uri: row.spotify_uri as string | null,
    artist: row.artist as string | null,
    status: row.status as "pending" | "approved" | "rejected",
    created_at: row.created_at as string,
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
  const query = status
    ? "SELECT r.*, v.username as viewer_username FROM requests r LEFT JOIN viewers v ON r.viewer_id = v.id WHERE r.status = ? ORDER BY r.created_at DESC"
    : "SELECT r.*, v.username as viewer_username FROM requests r LEFT JOIN viewers v ON r.viewer_id = v.id ORDER BY r.created_at DESC";
  const rows = (status ? db.query(query).all(status) : db.query(query).all()) as Record<string, unknown>[];
  return rows.map((row) => {
    const req = rowToRequest(row);
    return {
      ...req,
      viewer: row.viewer_username !== undefined ? { username: row.viewer_username as string | null } : null,
    };
  });
}

export function getRequest(id: string): RequestWithViewer | null {
  const row = db
    .query(
      "SELECT r.*, v.username as viewer_username FROM requests r LEFT JOIN viewers v ON r.viewer_id = v.id WHERE r.id = ?"
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    ...rowToRequest(row),
    viewer: row.viewer_username !== undefined ? { username: row.viewer_username as string | null } : null,
  };
}

export function getApprovedRequests(limit = 50): RequestWithViewer[] {
  const rows = db
    .query(
      `SELECT r.*, v.username as viewer_username FROM requests r LEFT JOIN viewers v ON r.viewer_id = v.id WHERE r.status = 'approved' ORDER BY r.created_at DESC LIMIT ?`
    )
    .all(limit) as Record<string, unknown>[];
  return rows.map((row) => ({
    ...rowToRequest(row),
    viewer: row.viewer_username !== undefined ? { username: row.viewer_username as string | null } : null,
  }));
}

export function insertRequest(data: InsertRequestData): RequestWithViewer {
  const id = crypto.randomUUID();
  db.run(
    "INSERT INTO requests (id, viewer_id, type, content, spotify_uri, artist, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      data.viewer_id,
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
