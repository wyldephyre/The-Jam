import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  clearOverlay,
  createAccount,
  deleteAccount,
  deleteSessionByHash,
  getAccountByNameKey,
  getAccountBySessionHash,
  getApprovedRequests,
  getApprovedSongCredits,
  getAllViewers,
  getOverlay,
  getRequest,
  getRequests,
  getViewer,
  insertRequest,
  insertSession,
  listAccounts,
  purgeExpiredSessions,
  setAccountBanned,
  setOverlay,
  toPublicAccount,
  toggleViewerRegular,
  updateRequestStatus,
  upsertViewer,
  type Account,
  type PublicAccount,
  type RequestWithViewer,
  type Viewer,
} from "./db";
import { searchTracks, addToQueue, getUpcomingTracks, invalidateQueueCache } from "./spotify";
import { buildOverlayText } from "./overlay-line";
import { addClient, removeClient, broadcast } from "./sse";
import { chatHub } from "./ssn";
import { forwardApprovedMessage } from "./ssn-publish";
import { getSsnRelay, startSsnRelay } from "./ssn-relay";
import {
  ADMIN_BODY,
  ADMIN_SCRIPT,
  GATE_BODY,
  GATE_SCRIPT,
  HUB_BODY,
  HUB_SCRIPT,
  LOGIN_BODY,
  LOGIN_SCRIPT,
  OVERLAY_BODY,
  OVERLAY_SCRIPT,
  htmlPage,
} from "./pages";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  allowAuthAttempt,
  cleanDisplayName,
  cleanEmail,
  cleanPassword,
  cleanPlatform,
  clientIp,
  hashPassword,
  hashSessionToken,
  newSessionToken,
  sessionCookieSecure,
  verifyPassword,
} from "./auth";

// ADMIN_PASSWORD is required. VIEWER_PASSWORD is an optional shared site gate:
// when it is set, viewer pages and viewer APIs still require x-viewer-password.
// It is not an identity. Song and message requests always require a viewer
// account session, and the name on the request comes from that account.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
if (!ADMIN_PASSWORD.trim()) {
  console.error(
    "FATAL: ADMIN_PASSWORD must be set to a non-empty value. Refusing to start. " +
      "Copy .env.example and fill it in. VIEWER_PASSWORD is optional; when set it is only a shared site gate."
  );
  process.exit(1);
}

declare module "hono" {
  interface ContextVariableMap {
    account: PublicAccount;
  }
}

const app = new Hono();
export { app };
const PORT = parseInt(process.env.PORT || "3000");
const REGULAR_THRESHOLD = parseInt(process.env.REGULAR_THRESHOLD_MINUTES || "18000", 10);

function viewerToJson(v: Viewer) {
  return { ...v, is_regular: Boolean(v.is_regular) };
}

import type { Context, Next } from "hono";
import { createHash, timingSafeEqual } from "node:crypto";

function siteGateEnabled(): boolean {
  return (process.env.VIEWER_PASSWORD ?? "").trim().length > 0;
}

function passwordMatches(given: unknown, expected: string): boolean {
  if (typeof given !== "string" || given.length === 0 || expected.length === 0) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function gateOk(c: Context): boolean {
  if (!siteGateEnabled()) return true;
  return passwordMatches(c.req.header("x-viewer-password"), process.env.VIEWER_PASSWORD ?? "");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SPOTIFY_TRACK_URI_RE = /^spotify:track:[A-Za-z0-9]{1,64}$/;
const MAX_MESSAGE = 500;
const MAX_SONG_FIELD = 200;

type Body = Record<string, unknown>;

async function readJson(c: Context): Promise<Body | null> {
  try {
    const body = await c.req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Body) : null;
  } catch {
    return null;
  }
}

const badBody = (c: Context) => c.json({ error: "Invalid JSON body" }, 400);

function cleanViewerId(v: unknown): string | null {
  return typeof v === "string" && UUID_RE.test(v) ? v.toLowerCase() : null;
}

function cleanLine(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001F\u007F]+/g, " ").trim();
  return s.length >= 1 && s.length <= max ? s : null;
}

function cleanMessage(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
  return s.length >= 1 && s.length <= max ? s : null;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function sessionAccount(c: Context): Account | null {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token || token.length < 20 || token.length > 200) return null;
  return getAccountBySessionHash(hashSessionToken(token), nowSeconds());
}

function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: sessionCookieSecure(c),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

function clearSessionCookie(c: Context) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token && token.length >= 20 && token.length <= 200) deleteSessionByHash(hashSessionToken(token));
  deleteCookie(c, SESSION_COOKIE, {
    path: "/",
    httpOnly: true,
    secure: sessionCookieSecure(c),
    sameSite: "Lax",
  });
}

function issueSession(c: Context, userId: string) {
  purgeExpiredSessions(nowSeconds());
  const token = newSessionToken();
  insertSession(hashSessionToken(token), userId, nowSeconds() + SESSION_TTL_SECONDS);
  setSessionCookie(c, token);
}

async function accountAuth(c: Context, next: Next) {
  if (!gateOk(c)) return c.json({ error: "Invalid password" }, 401);
  const account = sessionAccount(c);
  if (!account) return c.json({ error: "Login required" }, 401);
  if (account.banned) {
    clearSessionCookie(c);
    return c.json({ error: "This account is disabled" }, 403);
  }
  c.set("account", toPublicAccount(account));
  await next();
}

async function adminAuth(c: Context, next: Next) {
  if (!passwordMatches(c.req.header("x-admin-password"), ADMIN_PASSWORD)) {
    return c.json({ error: "Invalid admin password" }, 401);
  }
  await next();
}

const tooMany = (c: Context) => c.json({ error: "Too many attempts. Try again later." }, 429);

app.get("/api/auth/config", (c) => c.json({ siteGate: siteGateEnabled() }));

app.post("/api/auth/verify", async (c) => {
  const body = await readJson(c);
  if (!body) return badBody(c);
  const { password, type } = body;
  if (type === "viewer" && siteGateEnabled() && passwordMatches(password, process.env.VIEWER_PASSWORD ?? "")) {
    return c.json({ valid: true });
  }
  if (type === "admin" && passwordMatches(password, ADMIN_PASSWORD)) {
    return c.json({ valid: true });
  }
  return c.json({ valid: false, error: "Invalid password" }, 401);
});

app.post("/api/auth/signup", async (c) => {
  if (!allowAuthAttempt("signup", clientIp(c))) return tooMany(c);
  if (!gateOk(c)) return c.json({ error: "Invalid password" }, 401);
  const body = await readJson(c);
  if (!body) return badBody(c);
  const name = cleanDisplayName(body.displayName);
  if (!name) {
    return c.json(
      {
        error:
          "Username must be 2-40 characters and use letters, numbers, spaces, periods, underscores, hyphens, or apostrophes.",
      },
      400
    );
  }
  const platform = cleanPlatform(body.platform);
  if (!platform) return c.json({ error: "Choose a platform: twitch, youtube, rumble, x, kick, or other." }, 400);
  const password = cleanPassword(body.password);
  if (!password) return c.json({ error: "Password must be at least 8 characters." }, 400);
  const email = cleanEmail(body.email);
  if (email === "invalid") return c.json({ error: "Email looks invalid." }, 400);
  const passwordHash = await hashPassword(password);
  const created = createAccount({
    displayName: name.displayName,
    displayNameKey: name.key,
    platform,
    email,
    passwordHash,
  });
  if (!created.ok) {
    const error = created.reason === "email" ? "That email is already in use." : "That username is already taken.";
    return c.json({ error }, 409);
  }
  issueSession(c, created.account.id);
  return c.json({ user: toPublicAccount(created.account) }, 201);
});

app.post("/api/auth/login", async (c) => {
  if (!allowAuthAttempt("login", clientIp(c))) return tooMany(c);
  if (!gateOk(c)) return c.json({ error: "Invalid password" }, 401);
  const body = await readJson(c);
  if (!body) return badBody(c);
  const name = cleanDisplayName(body.displayName);
  const password = cleanPassword(body.password);
  if (!name || !password) return c.json({ error: "Invalid username or password" }, 401);
  const account = getAccountByNameKey(name.key);
  const ok = await verifyPassword(password, account?.password_hash ?? null);
  if (!account || !ok) return c.json({ error: "Invalid username or password" }, 401);
  if (account.banned) return c.json({ error: "This account is disabled" }, 403);
  issueSession(c, account.id);
  return c.json({ user: toPublicAccount(account) });
});

app.post("/api/auth/logout", (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});

app.get("/api/auth/me", (c) => {
  if (!gateOk(c)) return c.json({ error: "Invalid password" }, 401);
  const account = sessionAccount(c);
  if (!account) return c.json({ error: "Login required" }, 401);
  if (account.banned) {
    clearSessionCookie(c);
    return c.json({ error: "This account is disabled" }, 403);
  }
  return c.json({ user: toPublicAccount(account) });
});

app.post("/api/time/log", accountAuth, (c) => {
  const account = c.get("account");
  const before = getViewer(account.viewerId);
  const viewer = upsertViewer(account.viewerId, 1, REGULAR_THRESHOLD);
  const promoted = !!(before && !before.is_regular && viewer.is_regular);
  return c.json({
    viewer: viewerToJson(viewer),
    isRegular: Boolean(viewer.is_regular),
    promoted,
  });
});

app.post("/api/time/set-username", accountAuth, (c) => {
  return c.json({ error: "Your display name is the username on your account." }, 400);
});

app.get("/api/time/viewer/:id", accountAuth, (c) => {
  const account = c.get("account");
  const viewerId = cleanViewerId(c.req.param("id"));
  if (!viewerId || viewerId !== account.viewerId) return c.json({ error: "Not found" }, 404);
  const viewer = getViewer(viewerId);
  return c.json({ viewer: viewer ? viewerToJson(viewer) : null });
});

app.get("/api/requests/search", accountAuth, async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Query required" }, 400);
  try {
    const tracks = await searchTracks(q);
    return c.json({ tracks });
  } catch (e) {
    console.error("Spotify search error:", e);
    return c.json({ error: "Failed to search tracks" }, 500);
  }
});

app.post("/api/requests/submit", accountAuth, async (c) => {
  const account = c.get("account");
  const body = await readJson(c);
  if (!body) return badBody(c);
  const type = body.type;
  if (type !== "song" && type !== "message") {
    return c.json({ error: 'type must be "song" or "message"' }, 400);
  }
  let content: string | null;
  let artist: string | null = null;
  let spotifyUri: string | null = null;
  if (type === "message") {
    content = cleanMessage(body.content, MAX_MESSAGE);
    if (!content) return c.json({ error: `message required (1-${MAX_MESSAGE} characters)` }, 400);
  } else {
    content = cleanLine(body.content, MAX_SONG_FIELD);
    if (!content) return c.json({ error: `song title required (1-${MAX_SONG_FIELD} characters)` }, 400);
    if (body.artist != null && body.artist !== "") {
      artist = cleanLine(body.artist, MAX_SONG_FIELD);
      if (!artist) return c.json({ error: `artist must be 1-${MAX_SONG_FIELD} characters` }, 400);
    }
    if (body.spotifyUri != null && body.spotifyUri !== "") {
      if (typeof body.spotifyUri !== "string" || !SPOTIFY_TRACK_URI_RE.test(body.spotifyUri)) {
        return c.json({ error: "spotifyUri must look like spotify:track:<id>" }, 400);
      }
      spotifyUri = body.spotifyUri;
    }
  }
  const viewer = getViewer(account.viewerId);
  const isRegular = viewer ? Boolean(viewer.is_regular) : false;
  const status = isRegular && type === "song" ? "approved" : "pending";
  const request = insertRequest({
    viewer_id: account.viewerId,
    user_id: account.id,
    type,
    content,
    spotify_uri: spotifyUri,
    artist,
    status: status as "pending" | "approved" | "rejected",
  });
  if (status === "approved" && type === "song" && spotifyUri) {
    try {
      await addToQueue(spotifyUri);
      setOverlay(`Requested by ${account.displayName}: ${content}${artist ? ` - ${artist}` : ""}`);
      invalidateQueueCache();
    } catch (e) {
      console.error("Failed to add to Spotify queue:", e);
    }
  }
  // Pending requests are included so the admin list can refresh immediately.
  // The hub feed ignores anything that is not approved.
  broadcast("request", request);
  return c.json({
    request,
    autoApproved: status === "approved",
    message: status === "approved" ? "Your song has been added to the queue!" : "Your request is pending approval.",
  });
});

app.get("/api/requests/approved", accountAuth, (c) => {
  const requests = getApprovedRequests(50);
  return c.json({ requests });
});

app.get("/api/admin/requests", adminAuth, (c) => {
  const status = c.req.query("status");
  const requests = getRequests(status || undefined);
  return c.json({ requests });
});

app.post("/api/admin/requests/:id/approve", adminAuth, async (c) => {
  const id = c.req.param("id");
  const request = getRequest(id);
  if (!request) return c.json({ error: "Request not found" }, 404);
  updateRequestStatus(id, "approved");
  if (request.type === "song" && request.spotify_uri) {
    try {
      await addToQueue(request.spotify_uri);
      const username = request.viewer?.username || "Anonymous";
      setOverlay(`Requested by ${username}: ${request.content}${request.artist ? ` - ${request.artist}` : ""}`);
      invalidateQueueCache();
    } catch (e) {
      console.error("Failed to add to Spotify queue:", e);
    }
  }
  const updated: RequestWithViewer = { ...request, status: "approved" };
  broadcast("request", updated);
  try {
    forwardApprovedMessage(request);
  } catch (error) {
    console.error("SSN message forward failed:", error instanceof Error ? error.message : "unknown error");
  }
  return c.json({ success: true, request: updated });
});

app.post("/api/admin/requests/:id/reject", adminAuth, (c) => {
  updateRequestStatus(c.req.param("id"), "rejected");
  return c.json({ success: true });
});

app.get("/api/admin/viewers", adminAuth, (c) => {
  const viewers = getAllViewers().map(viewerToJson);
  return c.json({ viewers });
});

app.post("/api/admin/viewers/:id/toggle-regular", adminAuth, (c) => {
  const viewer = toggleViewerRegular(c.req.param("id"));
  if (!viewer) return c.json({ error: "Viewer not found" }, 404);
  return c.json({ viewer: viewerToJson(viewer) });
});

app.get("/api/admin/accounts", adminAuth, (c) => {
  return c.json({ accounts: listAccounts() });
});

app.post("/api/admin/accounts/:id/ban", adminAuth, (c) => {
  const id = cleanViewerId(c.req.param("id"));
  if (!id) return c.json({ error: "valid account id required" }, 400);
  const account = setAccountBanned(id, true);
  if (!account) return c.json({ error: "Account not found" }, 404);
  return c.json({ account });
});

app.post("/api/admin/accounts/:id/unban", adminAuth, (c) => {
  const id = cleanViewerId(c.req.param("id"));
  if (!id) return c.json({ error: "valid account id required" }, 400);
  const account = setAccountBanned(id, false);
  if (!account) return c.json({ error: "Account not found" }, 404);
  return c.json({ account });
});

app.delete("/api/admin/accounts/:id", adminAuth, (c) => {
  const id = cleanViewerId(c.req.param("id"));
  if (!id) return c.json({ error: "valid account id required" }, 400);
  if (!deleteAccount(id)) return c.json({ error: "Account not found" }, 404);
  return c.json({ success: true });
});

app.post("/api/admin/overlay/clear", adminAuth, (c) => {
  clearOverlay();
  return c.json({ success: true });
});

app.get("/api/overlay/current", async (c) => {
  const nowPlaying = getOverlay();
  let tracks: Awaited<ReturnType<typeof getUpcomingTracks>> = null;
  try {
    tracks = await getUpcomingTracks();
  } catch {
    tracks = null;
  }
  const credits = tracks && tracks.length > 0 ? getApprovedSongCredits() : [];
  const body = buildOverlayText(nowPlaying, tracks, credits);
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});

app.get("/api/events", (c) => {
  const stream = new ReadableStream({
    start(controller) {
      addClient(controller);
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);
      (controller as { _keepAlive?: ReturnType<typeof setInterval> })._keepAlive = keepAlive;
    },
    cancel(controller) {
      const ka = (controller as { _keepAlive?: ReturnType<typeof setInterval> })._keepAlive;
      if (ka) clearInterval(ka);
      removeClient(controller);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});

function chatStatus() {
  return (
    getSsnRelay()?.status() ?? {
      mode: "server-relay" as const,
      configured: false,
      connected: false,
      state: "unconfigured" as const,
      platforms: ["twitch", "youtube", "rumble", "x", "twitter"],
      hideBots: false,
    }
  );
}

function chatAuth(c: Context): boolean {
  if (passwordMatches(c.req.header("x-admin-password"), ADMIN_PASSWORD)) return true;
  if (siteGateEnabled() && passwordMatches(c.req.header("x-viewer-password"), process.env.VIEWER_PASSWORD ?? "")) {
    return true;
  }
  const account = sessionAccount(c);
  return !!account && !account.banned;
}

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/chat/status", (c) => {
  if (!chatAuth(c)) return c.json({ error: "Invalid password" }, 401);
  return c.json(chatStatus());
});

app.post("/api/chat/ticket", (c) => {
  if (!chatAuth(c)) return c.json({ error: "Invalid password" }, 401);
  return c.json(chatHub.issueTicket());
});

app.get("/api/chat/recent", (c) => {
  if (!chatAuth(c)) return c.json({ error: "Invalid password" }, 401);
  return c.json({ messages: chatHub.recent(50), status: chatStatus() });
});

app.get("/api/chat/stream", (c) => {
  const ticket = c.req.query("ticket") ?? "";
  if (!chatHub.validTicket(ticket)) return c.json({ error: "Invalid ticket" }, 401);
  let unsubscribe = () => {};
  let keepAlive: ReturnType<typeof setInterval> | undefined;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      unsubscribe = chatHub.subscribe(send);
      try {
        send("status", chatStatus());
      } catch {
        // The stream can close before the first write.
      }
      keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          if (keepAlive) clearInterval(keepAlive);
        }
      }, 20000);
    },
    cancel() {
      if (keepAlive) clearInterval(keepAlive);
      unsubscribe();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});

app.get("/", (c) => {
  if (c.req.query("admin") !== "true" && !siteGateEnabled()) return c.redirect("/login");
  return c.html(htmlPage("WyldePhyre — Gate", GATE_BODY, GATE_SCRIPT));
});
app.get("/login", (c) => c.html(htmlPage("WyldePhyre — Account", LOGIN_BODY, LOGIN_SCRIPT)));
app.get("/overlay", (c) => c.html(htmlPage("WyldePhyre — Overlay", OVERLAY_BODY, OVERLAY_SCRIPT)));
app.get("/hub", (c) => c.html(htmlPage("WyldePhyre — Hub", HUB_BODY, HUB_SCRIPT)));
app.get("/admin", (c) => c.html(htmlPage("WyldePhyre — Admin", ADMIN_BODY, ADMIN_SCRIPT)));

startSsnRelay();

export default {
  port: PORT,
  hostname: "0.0.0.0",
  fetch: app.fetch,
  idleTimeout: 0,
};
