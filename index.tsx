import { Hono } from "hono";
import {
  getViewer,
  upsertViewer,
  setViewerUsername,
  getAllViewers,
  toggleViewerRegular,
  getRequests,
  getRequest,
  getApprovedRequests,
  insertRequest,
  updateRequestStatus,
  getOverlay,
  setOverlay,
  clearOverlay,
  type Viewer,
  type RequestWithViewer,
} from "./db";
import { searchTracks, addToQueue } from "./spotify";
import { addClient, removeClient, broadcast } from "./sse";
import { htmlPage, GATE_BODY, GATE_SCRIPT, HUB_BODY, HUB_SCRIPT, ADMIN_BODY, ADMIN_SCRIPT } from "./pages";

// Refuse to start without both passwords. An unset/empty password must never
// mean "no password needed".
const VIEWER_PASSWORD = process.env.VIEWER_PASSWORD ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const missingEnv = [
  !VIEWER_PASSWORD.trim() && "VIEWER_PASSWORD",
  !ADMIN_PASSWORD.trim() && "ADMIN_PASSWORD",
].filter(Boolean);
if (missingEnv.length > 0) {
  console.error(
    `FATAL: ${missingEnv.join(" and ")} must be set to a non-empty value. ` +
      "Refusing to start without passwords. Copy .env.example and fill them in."
  );
  process.exit(1);
}

const app = new Hono();
const PORT = parseInt(process.env.PORT || "3000");
const REGULAR_THRESHOLD = parseInt(process.env.REGULAR_THRESHOLD_MINUTES || "18000", 10);

function viewerToJson(v: Viewer) {
  return { ...v, is_regular: Boolean(v.is_regular) };
}

import type { Context, Next } from "hono";
import { createHash, timingSafeEqual } from "node:crypto";

// Constant-time compare. Anything that is not a string (e.g. a missing header) never matches.
function passwordMatches(given: unknown, expected: string): boolean {
  if (typeof given !== "string" || given.length === 0 || expected.length === 0) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// ---- Input validation helpers -------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SPOTIFY_TRACK_URI_RE = /^spotify:track:[A-Za-z0-9]{1,64}$/;
const MAX_USERNAME = 30;
const MAX_MESSAGE = 500;
const MAX_SONG_FIELD = 200;

type Body = Record<string, unknown>;

// Returns the parsed JSON object, or null if the body is missing, not JSON, or not an object.
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

// Single-line text: control characters (incl. newlines) become spaces, trimmed, 1..max chars.
function cleanLine(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001F\u007F]+/g, " ").trim();
  return s.length >= 1 && s.length <= max ? s : null;
}

// Multi-line text (messages): drop control characters except tab/newline, trimmed, 1..max chars.
function cleanMessage(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
  return s.length >= 1 && s.length <= max ? s : null;
}

async function viewerAuth(c: Context, next: Next) {
  if (!passwordMatches(c.req.header("x-viewer-password"), VIEWER_PASSWORD)) {
    return c.json({ error: "Invalid password" }, 401);
  }
  await next();
}

async function adminAuth(c: Context, next: Next) {
  if (!passwordMatches(c.req.header("x-admin-password"), ADMIN_PASSWORD)) {
    return c.json({ error: "Invalid admin password" }, 401);
  }
  await next();
}

// Auth
app.post("/api/auth/verify", async (c) => {
  const body = await readJson(c);
  if (!body) return badBody(c);
  const { password, type } = body;
  if (type === "viewer" && passwordMatches(password, VIEWER_PASSWORD)) {
    return c.json({ valid: true });
  }
  if (type === "admin" && passwordMatches(password, ADMIN_PASSWORD)) {
    return c.json({ valid: true });
  }
  return c.json({ valid: false, error: "Invalid password" }, 401);
});

// Time
app.post("/api/time/log", viewerAuth, async (c) => {
  const body = await readJson(c);
  if (!body) return badBody(c);
  const viewerId = cleanViewerId(body.viewerId);
  if (!viewerId) return c.json({ error: "valid viewerId (UUID) required" }, 400);
  const before = getViewer(viewerId);
  const viewer = upsertViewer(viewerId, 1, REGULAR_THRESHOLD);
  const promoted = !!(before && !before.is_regular && viewer.is_regular);
  return c.json({
    viewer: viewerToJson(viewer),
    isRegular: Boolean(viewer.is_regular),
    promoted,
  });
});

app.post("/api/time/set-username", viewerAuth, async (c) => {
  const body = await readJson(c);
  if (!body) return badBody(c);
  const viewerId = cleanViewerId(body.viewerId);
  if (!viewerId) return c.json({ error: "valid viewerId (UUID) required" }, 400);
  const username = cleanLine(body.username, MAX_USERNAME);
  if (!username) return c.json({ error: `username required (1-${MAX_USERNAME} characters)` }, 400);
  const viewer = setViewerUsername(viewerId, username);
  return c.json({ viewer: viewerToJson(viewer) });
});

app.get("/api/time/viewer/:id", viewerAuth, (c) => {
  const viewerId = cleanViewerId(c.req.param("id"));
  if (!viewerId) return c.json({ error: "valid viewerId (UUID) required" }, 400);
  const viewer = getViewer(viewerId);
  return c.json({ viewer: viewer ? viewerToJson(viewer) : null });
});

// Requests
app.get("/api/requests/search", viewerAuth, async (c) => {
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

app.post("/api/requests/submit", viewerAuth, async (c) => {
  const body = await readJson(c);
  if (!body) return badBody(c);
  const viewerId = cleanViewerId(body.viewerId);
  if (!viewerId) return c.json({ error: "valid viewerId (UUID) required" }, 400);
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
  const viewer = getViewer(viewerId);
  const isRegular = viewer ? Boolean(viewer.is_regular) : false;
  const status = isRegular && type === "song" ? "approved" : "pending";
  const request = insertRequest({
    viewer_id: viewerId,
    type,
    content,
    spotify_uri: spotifyUri,
    artist,
    status: status as "pending" | "approved" | "rejected",
  });
  if (status === "approved" && type === "song" && spotifyUri) {
    try {
      await addToQueue(spotifyUri);
      const username = viewer?.username || "Anonymous";
      setOverlay(`Requested by ${username}: ${content}${artist ? ` - ${artist}` : ""}`);
    } catch (e) {
      console.error("Failed to add to Spotify queue:", e);
    }
  }
  if (status === "approved") {
    broadcast("request", request);
  }
  return c.json({
    request,
    autoApproved: status === "approved",
    message: status === "approved" ? "Your song has been added to the queue!" : "Your request is pending approval.",
  });
});

app.get("/api/requests/approved", viewerAuth, (c) => {
  const requests = getApprovedRequests(50);
  return c.json({ requests });
});

// Admin
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
    } catch (e) {
      console.error("Failed to add to Spotify queue:", e);
    }
  }
  const updated: RequestWithViewer = { ...request, status: "approved" };
  broadcast("request", updated);
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

app.post("/api/admin/overlay/clear", adminAuth, (c) => {
  clearOverlay();
  return c.json({ success: true });
});

// Overlay (no auth)
app.get("/api/overlay/current", (c) => {
  return new Response(getOverlay(), {
    headers: { "Content-Type": "text/plain" },
  });
});

// SSE
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
    },
  });
});

app.get("/", (c) => c.html(htmlPage("WyldePhyre — Gate", GATE_BODY, GATE_SCRIPT)));
app.get("/hub", (c) => c.html(htmlPage("WyldePhyre — Hub", HUB_BODY, HUB_SCRIPT)));
app.get("/admin", (c) => c.html(htmlPage("WyldePhyre — Admin", ADMIN_BODY, ADMIN_SCRIPT)));

export default {
  port: PORT,
  fetch: app.fetch,
};
