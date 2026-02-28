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

const app = new Hono();
const PORT = parseInt(process.env.PORT || "3000");
const REGULAR_THRESHOLD = parseInt(process.env.REGULAR_THRESHOLD_MINUTES || "18000", 10);

function viewerToJson(v: Viewer) {
  return { ...v, is_regular: Boolean(v.is_regular) };
}

import type { Context, Next } from "hono";

async function viewerAuth(c: Context, next: Next) {
  const password = c.req.header("x-viewer-password");
  if (password !== process.env.VIEWER_PASSWORD) {
    return c.json({ error: "Invalid password" }, 401);
  }
  await next();
}

async function adminAuth(c: Context, next: Next) {
  const password = c.req.header("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return c.json({ error: "Invalid admin password" }, 401);
  }
  await next();
}

// Auth
app.post("/api/auth/verify", async (c) => {
  const body = (await c.req.json()) as { password?: string; type?: string };
  const { password, type } = body;
  if (type === "viewer" && password === process.env.VIEWER_PASSWORD) {
    return c.json({ valid: true });
  }
  if (type === "admin" && password === process.env.ADMIN_PASSWORD) {
    return c.json({ valid: true });
  }
  return c.json({ valid: false, error: "Invalid password" }, 401);
});

// Time
app.post("/api/time/log", viewerAuth, async (c) => {
  const body = (await c.req.json()) as { viewerId?: string };
  const viewerId = body.viewerId;
  if (!viewerId) return c.json({ error: "viewerId required" }, 400);
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
  const body = (await c.req.json()) as { viewerId?: string; username?: string };
  const { viewerId, username } = body;
  if (!viewerId || !username) return c.json({ error: "viewerId and username required" }, 400);
  const viewer = setViewerUsername(viewerId, username);
  return c.json({ viewer: viewerToJson(viewer) });
});

app.get("/api/time/viewer/:id", viewerAuth, (c) => {
  const viewer = getViewer(c.req.param("id"));
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
  const body = (await c.req.json()) as {
    viewerId?: string;
    type?: string;
    content?: string;
    spotifyUri?: string | null;
    artist?: string | null;
  };
  const { viewerId, type, content, spotifyUri, artist } = body;
  if (!viewerId || !type || !content) {
    return c.json({ error: "viewerId, type, and content required" }, 400);
  }
  const viewer = getViewer(viewerId);
  const isRegular = viewer ? Boolean(viewer.is_regular) : false;
  const status = isRegular && type === "song" ? "approved" : "pending";
  const request = insertRequest({
    viewer_id: viewerId,
    type: type as "song" | "message",
    content,
    spotify_uri: spotifyUri ?? null,
    artist: artist ?? null,
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
