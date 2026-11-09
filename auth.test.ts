import { afterAll, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addClient, removeClient } from "./sse";
import { buildJamExtContent } from "./ssn-publish";

const dir = mkdtempSync(join(tmpdir(), "jam-auth-"));
process.env.JAM_DB_PATH = join(dir, "test.db");
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.VIEWER_PASSWORD = "test-viewer-password";
process.env.COOKIE_SECURE = "0";
process.env.SSN_SESSION_ID = "";

const { db, migrateSchema, setOverlay } = await import("./db");
const { app } = await import("./index.tsx");
const { authPolicy, cleanDisplayName, hashSessionToken, resetAuthRateLimits } = await import("./auth");
const { resetQueueCacheForTests } = await import("./spotify");

afterAll(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

const ADMIN = "test-admin-password";
let ipSeq = 20;

function nextIp(): string {
  ipSeq += 1;
  return `203.0.113.${ipSeq}`;
}

function jsonHeaders(opts: { cookie?: string; skipGate?: boolean; proto?: string; ip?: string } = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": opts.ip ?? nextIp(),
  };
  if (!opts.skipGate && (process.env.VIEWER_PASSWORD ?? "").trim()) {
    headers["x-viewer-password"] = process.env.VIEWER_PASSWORD ?? "";
  }
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.proto) headers["x-forwarded-proto"] = opts.proto;
  return headers;
}

function cookieHeader(res: Response): string {
  const raw = res.headers.get("set-cookie") ?? "";
  const match = raw.match(/jam_session=([^;]+)/);
  if (!match?.[1]) throw new Error(`expected session cookie, got ${raw}`);
  return `jam_session=${match[1]}`;
}

async function signup(displayName: string, platform = "twitch", extra: Record<string, unknown> = {}, headerOpts = {}) {
  const password = "long-password-1";
  const res = await app.request("/api/auth/signup", {
    method: "POST",
    headers: jsonHeaders(headerOpts),
    body: JSON.stringify({ displayName, platform, password, ...extra }),
  });
  const body = await res.json();
  return { res, body, password, cookie: res.status === 201 ? cookieHeader(res) : "" };
}

describe("viewer accounts", () => {
  test("signup, login, logout, and the session cookie", async () => {
    const created = await signup("  StreamFan  ");
    expect(created.res.status).toBe(201);
    expect(created.body.user.displayName).toBe("StreamFan");
    expect(created.body.user.platform).toBe("twitch");
    expect(JSON.stringify(created.body)).not.toContain("long-password-1");
    expect(JSON.stringify(created.body)).not.toContain("password_hash");
    const setCookie = created.res.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie.toLowerCase()).not.toContain("secure");

    const row = db.query("SELECT password_hash FROM users WHERE id = ?").get(created.body.user.id) as { password_hash: string };
    expect(row.password_hash.startsWith("$argon2id$")).toBe(true);
    expect(row.password_hash).not.toContain("long-password-1");
    const token = created.cookie.slice("jam_session=".length);
    const session = db.query("SELECT id FROM sessions WHERE id = ?").get(hashSessionToken(token)) as { id: string };
    expect(session.id).toHaveLength(64);
    expect(session.id).not.toBe(token);

    const me = await app.request("/api/auth/me", { headers: jsonHeaders({ cookie: created.cookie }) });
    expect(me.status).toBe(200);

    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ displayName: "streamfan", password: "long-password-1" }),
    });
    expect(login.status).toBe(200);
    const loginCookie = cookieHeader(login);

    const loggedOut = await app.request("/api/auth/logout", { method: "POST", headers: { cookie: loginCookie } });
    expect(loggedOut.status).toBe(200);
    const after = await app.request("/api/auth/me", { headers: jsonHeaders({ cookie: loginCookie }) });
    expect(after.status).toBe(401);

    const page = await app.request("/login");
    expect(await page.text()).toContain("Your Twitch / YouTube / Rumble / X username");
  });

  test("rejects duplicate names, bad names, and short passwords", async () => {
    const first = await signup("Cool Name");
    expect(first.res.status).toBe(201);
    const dup = await signup("cool name");
    expect(dup.res.status).toBe(409);
    expect(dup.body.error).toContain("already taken");

    const short = await signup("ShortPw", "youtube", { password: "short" });
    expect(short.res.status).toBe(400);
    const weird = await signup("<script>");
    expect(weird.res.status).toBe(400);
    const tiny = await signup("a");
    expect(tiny.res.status).toBe(400);
    expect(cleanDisplayName("O'Brien")?.displayName).toBe("O'Brien");
    expect(cleanDisplayName("a--b")).toBeNull();

    const noEmail = await signup("NoMailFan");
    const noEmail2 = await signup("NoMailFan2");
    expect(noEmail.res.status).toBe(201);
    expect(noEmail2.res.status).toBe(201);
    const badEmail = await signup("MailFan", "x", { email: "not-an-email" });
    expect(badEmail.res.status).toBe(400);
  });

  test("secure cookie when the request is https", async () => {
    const previous = process.env.COOKIE_SECURE;
    delete process.env.COOKIE_SECURE;
    try {
      const res = await app.request("/api/auth/signup", {
        method: "POST",
        headers: jsonHeaders({ proto: "https" }),
        body: JSON.stringify({ displayName: "HttpsFan", platform: "kick", password: "long-password-1" }),
      });
      expect(res.status).toBe(201);
      expect((res.headers.get("set-cookie") ?? "").toLowerCase()).toContain("secure");
    } finally {
      process.env.COOKIE_SECURE = previous;
    }
  });

  test("banned accounts cannot log in or request, and delete frees the name", async () => {
    const created = await signup("BannedFan", "rumble");
    expect(created.res.status).toBe(201);
    const ban = await app.request(`/api/admin/accounts/${created.body.user.id}/ban`, {
      method: "POST",
      headers: { "x-admin-password": ADMIN },
    });
    expect(ban.status).toBe(200);
    const listed = await (await app.request("/api/admin/accounts", { headers: { "x-admin-password": ADMIN } })).json();
    expect(JSON.stringify(listed)).not.toContain("password_hash");
    expect(JSON.stringify(listed)).not.toContain("long-password-1");

    const submit = await app.request("/api/requests/submit", {
      method: "POST",
      headers: jsonHeaders({ cookie: created.cookie }),
      body: JSON.stringify({ type: "message", content: "should not land" }),
    });
    expect(submit.status).toBe(401);
    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ displayName: "BannedFan", password: "long-password-1" }),
    });
    expect(login.status).toBe(403);

    const removed = await app.request(`/api/admin/accounts/${created.body.user.id}`, {
      method: "DELETE",
      headers: { "x-admin-password": ADMIN },
    });
    expect(removed.status).toBe(200);
    const again = await signup("BannedFan", "rumble");
    expect(again.res.status).toBe(201);
  });

  test("request creation requires a logged-in viewer and uses the account name", async () => {
    const anon = await app.request("/api/requests/submit", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        viewerId: crypto.randomUUID(),
        username: "Impostor",
        type: "message",
        content: "hello from nobody",
      }),
    });
    expect(anon.status).toBe(401);
    const none = db.query("SELECT COUNT(*) AS n FROM requests WHERE content = ?").get("hello from nobody") as { n: number };
    expect(none.n).toBe(0);

    let controller: ReadableStreamDefaultController | undefined;
    const stream = new ReadableStream({
      start(c) {
        controller = c;
        addClient(c);
      },
    });
    const reader = stream.getReader();
    try {
      const created = await signup("QueueFan", "youtube");
      const res = await app.request("/api/requests/submit", {
        method: "POST",
        headers: jsonHeaders({ cookie: created.cookie }),
        body: JSON.stringify({
          type: "message",
          content: "play the jam",
          username: "Impostor",
          viewerId: crypto.randomUUID(),
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.request.user_id).toBe(created.body.user.id);
      expect(body.request.viewer.username).toBe("QueueFan");
      expect(body.request.viewer.platform).toBe("youtube");
      expect(JSON.stringify(body)).not.toContain("Impostor");
      expect(buildJamExtContent(body.request.viewer.username, body.request.content)?.chatname).toBe("QueueFan");

      const read = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out waiting for sse")), 1000)),
      ]);
      const text = new TextDecoder().decode(read.value);
      expect(text).toContain("event: request");
      expect(text).toContain('"status":"pending"');
      expect(text).toContain("play the jam");
    } finally {
      if (controller) removeClient(controller);
      await reader.cancel();
    }
  });

  test("site gate still blocks signup when VIEWER_PASSWORD is set, and is optional when empty", async () => {
    const blocked = await app.request("/api/auth/signup", {
      method: "POST",
      headers: jsonHeaders({ skipGate: true }),
      body: JSON.stringify({ displayName: "NoGateYet", platform: "other", password: "long-password-1" }),
    });
    expect(blocked.status).toBe(401);

    const previous = process.env.VIEWER_PASSWORD;
    process.env.VIEWER_PASSWORD = "";
    try {
      const home = await app.request("/");
      expect(home.status).toBe(302);
      expect(home.headers.get("location") ?? "").toContain("/login");
      const created = await signup("OpenGateFan", "other", {}, { skipGate: true });
      expect(created.res.status).toBe(201);
      const submit = await app.request("/api/requests/submit", {
        method: "POST",
        headers: jsonHeaders({ cookie: created.cookie, skipGate: true }),
        body: JSON.stringify({ type: "message", content: "open gate hello" }),
      });
      expect(submit.status).toBe(200);
    } finally {
      process.env.VIEWER_PASSWORD = previous;
    }
  });

  test("login is rate limited", async () => {
    resetAuthRateLimits();
    const previous = authPolicy.loginLimit;
    authPolicy.loginLimit = 2;
    const ip = nextIp();
    try {
      await signup("LimitFan", "twitch", {}, { ip });
      const attempt = () =>
        app.request("/api/auth/login", {
          method: "POST",
          headers: jsonHeaders({ ip }),
          body: JSON.stringify({ displayName: "LimitFan", password: "wrong-password" }),
        });
      expect((await attempt()).status).toBe(401);
      expect((await attempt()).status).toBe(401);
      expect((await attempt()).status).toBe(429);
    } finally {
      authPolicy.loginLimit = previous;
      resetAuthRateLimits();
    }
  });

  test("migration keeps existing requests and the overlay now-playing line", () => {
    const database = new Database(":memory:");
    database.run(`CREATE TABLE viewers (
      id TEXT PRIMARY KEY, username TEXT, total_minutes INTEGER DEFAULT 0,
      is_regular INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
    )`);
    database.run(`CREATE TABLE requests (
      id TEXT PRIMARY KEY, viewer_id TEXT, type TEXT NOT NULL, content TEXT NOT NULL,
      spotify_uri TEXT, artist TEXT, status TEXT DEFAULT 'pending', created_at TEXT
    )`);
    database.run("INSERT INTO viewers (id, username, total_minutes) VALUES (?, ?, ?)", ["viewer-1", "oldname", 12]);
    database.run("INSERT INTO requests (id, viewer_id, type, content, status) VALUES (?, ?, ?, ?, ?)", [
      "req-1",
      "viewer-1",
      "message",
      "keep me",
      "pending",
    ]);
    migrateSchema(database);
    migrateSchema(database);
    const row = database.query("SELECT content, user_id, viewer_id FROM requests WHERE id = ?").get("req-1") as {
      content: string;
      user_id: string | null;
      viewer_id: string;
    };
    expect(row).toEqual({ content: "keep me", user_id: null, viewer_id: "viewer-1" });
    const viewer = database.query("SELECT username, total_minutes FROM viewers WHERE id = ?").get("viewer-1") as {
      username: string;
      total_minutes: number;
    };
    expect(viewer).toEqual({ username: "oldname", total_minutes: 12 });
    const tables = database.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'sessions')").all();
    expect(tables).toHaveLength(2);
    database.close();
  });

  test("old rows still list, and overlay text is unchanged when Spotify is unavailable", async () => {
    db.run("INSERT INTO viewers (id, username, total_minutes) VALUES (?, ?, ?)", ["viewer-legacy", "oldname", 4]);
    db.run("INSERT INTO requests (id, viewer_id, type, content, status) VALUES (?, ?, ?, ?, ?)", [
      "legacy-req",
      "viewer-legacy",
      "message",
      "legacy message",
      "pending",
    ]);
    const listed = await (
      await app.request("/api/admin/requests?status=pending", { headers: { "x-admin-password": ADMIN } })
    ).json();
    const legacy = listed.requests.find((row: { id: string }) => row.id === "legacy-req");
    expect(legacy.viewer.username).toBe("oldname");
    expect(legacy.user_id).toBeNull();

    const saved = {
      id: process.env.SPOTIFY_CLIENT_ID,
      secret: process.env.SPOTIFY_CLIENT_SECRET,
      refresh: process.env.SPOTIFY_REFRESH_TOKEN,
    };
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
    delete process.env.SPOTIFY_REFRESH_TOKEN;
    resetQueueCacheForTests();
    setOverlay("Requested by Nia: Keep Me - Artist");
    try {
      const res = await app.request("/api/overlay/current");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Requested by Nia: Keep Me - Artist");
      const page = await app.request("/overlay");
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("/api/overlay/current");
    } finally {
      if (saved.id === undefined) delete process.env.SPOTIFY_CLIENT_ID;
      else process.env.SPOTIFY_CLIENT_ID = saved.id;
      if (saved.secret === undefined) delete process.env.SPOTIFY_CLIENT_SECRET;
      else process.env.SPOTIFY_CLIENT_SECRET = saved.secret;
      if (saved.refresh === undefined) delete process.env.SPOTIFY_REFRESH_TOKEN;
      else process.env.SPOTIFY_REFRESH_TOKEN = saved.refresh;
      resetQueueCacheForTests();
      setOverlay("");
    }
  });
});
