# The Jam — Zo Computer Refactor Spec
**For Cursor. Do not execute until you have read this entire document.**

---

## Goal
Rewrite the WyldePhyre Viewer Hub from its current Node.js/Express + React/Vite + Supabase/Vercel stack into a single Zo Computer site running on Hono + Bun + TypeScript + SQLite, hosted at `the-jam-zo.zocomputer.io`.

---

## Decisions Already Made
| Question | Answer |
|---|---|
| Frontend | Hono JSX (server-side HTML shell + vanilla JS for interactivity) |
| Database | SQLite via Bun's built-in driver — drop Supabase entirely |
| Real-time | SSE (Server-Sent Events) — replaces Supabase Realtime |
| OBS Overlay | API endpoint only (`GET /api/overlay/current`) — no file writes |
| Zo Handle | `zo` → hosted URL: `the-jam-zo.zocomputer.io` |

---

## What to Delete
Remove these directories and files entirely:
- `backend/` (entire directory)
- `frontend/` (entire directory)
- `env.example` (root level — will be replaced)

Keep:
- `supabase/schema.sql` (reference only, do not use)
- `README.md`, `DEVLOG.md`, `.gitignore`

---

## New File Structure
```
The-Jam/
├── index.tsx           ← Main Hono app (routes + HTML pages)
├── db.ts               ← SQLite setup, schema, and all query functions
├── spotify.ts          ← Spotify Web API wrapper using native fetch
├── sse.ts              ← SSE broadcast manager
├── zosite.json         ← Zo hosting config
├── CLAUDE              ← Zo agent documentation
├── tsconfig.json       ← TypeScript config
├── package.json        ← Bun package manifest
├── .env.example        ← Updated env vars (no Supabase)
└── .gitignore          ← Updated
```

---

## package.json
```json
{
  "name": "the-jam",
  "version": "1.0.0",
  "scripts": {
    "dev": "bun run --hot index.tsx",
    "start": "bun run index.tsx"
  },
  "dependencies": {
    "hono": "^4.6.0"
  }
}
```
> Bun has built-in SQLite, fetch, crypto, and UUID — no extra packages needed for those.

---

## tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "strict": true,
    "types": ["bun-types"]
  }
}
```

---

## zosite.json
```json
{
  "name": "the-jam",
  "description": "WyldePhyre Viewer Hub — multi-platform stream interaction site"
}
```

---

## CLAUDE
```
# The Jam — WyldePhyre Viewer Hub

Single-file Zo site. Stack: Hono + Bun + SQLite + SSE.

- index.tsx: All routes and HTML page rendering
- db.ts: SQLite database (viewers, requests, overlay tables)
- spotify.ts: Spotify Web API (token refresh, search, queue)
- sse.ts: Server-Sent Events broadcast for real-time feed

API routes all start with /api. Three frontend pages: / (gate), /hub, /admin.
Auth uses x-viewer-password and x-admin-password headers (env vars).
Real-time updates are delivered via GET /api/events (SSE).
```

---

## .env.example
```
VIEWER_PASSWORD=your-viewer-password
ADMIN_PASSWORD=your-admin-password
REGULAR_THRESHOLD_MINUTES=18000
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REFRESH_TOKEN=your-spotify-refresh-token
PORT=3000
```

---

## db.ts — SQLite Layer

### Schema (create on startup with `CREATE TABLE IF NOT EXISTS`)

```sql
-- viewers
CREATE TABLE IF NOT EXISTS viewers (
  id TEXT PRIMARY KEY,
  username TEXT,
  total_minutes INTEGER DEFAULT 0,
  is_regular INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- requests
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  viewer_id TEXT REFERENCES viewers(id),
  type TEXT NOT NULL,       -- 'song' | 'message'
  content TEXT NOT NULL,
  spotify_uri TEXT,
  artist TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at TEXT DEFAULT (datetime('now'))
);

-- overlay: single-row table, stores current now-playing text
CREATE TABLE IF NOT EXISTS overlay (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content TEXT DEFAULT ''
);
INSERT OR IGNORE INTO overlay (id, content) VALUES (1, '');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_viewer_id ON requests(viewer_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_viewers_is_regular ON viewers(is_regular);
```

### Use Bun's built-in SQLite driver:
```ts
import { Database } from "bun:sqlite";
export const db = new Database("the-jam.db");
```

### Query functions to export from db.ts:
All functions are synchronous (Bun SQLite is sync).

```ts
// Viewers
getViewer(id: string): Viewer | null
upsertViewer(id: string, minutesToAdd: number, threshold: number): Viewer
setViewerUsername(id: string, username: string): Viewer
getAllViewers(): Viewer[]
toggleViewerRegular(id: string): Viewer

// Requests (with joined viewer username)
getRequests(status?: string): RequestWithViewer[]
getRequest(id: string): RequestWithViewer | null
getApprovedRequests(limit?: number): RequestWithViewer[]
insertRequest(data: InsertRequestData): RequestWithViewer
updateRequestStatus(id: string, status: string): void

// Overlay
getOverlay(): string
setOverlay(content: string): void
clearOverlay(): void
```

### TypeScript types to define in db.ts:
```ts
type Viewer = {
  id: string;
  username: string | null;
  total_minutes: number;
  is_regular: number; // SQLite uses 0/1
  created_at: string;
  updated_at: string;
};

type Request = {
  id: string;
  viewer_id: string;
  type: "song" | "message";
  content: string;
  spotify_uri: string | null;
  artist: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type RequestWithViewer = Request & {
  viewer: { username: string | null } | null;
};
```

### UUID generation: use `crypto.randomUUID()` (Bun built-in, no package needed)

---

## spotify.ts — Spotify Service

Replace `spotify-web-api-node` with raw `fetch()` calls. Bun has native fetch.

```ts
// Token management (module-level variables)
let accessToken = "";
let tokenExpiresAt = 0;

async function ensureAccessToken(): Promise<void>
// POST https://accounts.spotify.com/api/token
// grant_type=refresh_token, refresh_token=env, auth=Base64(clientId:clientSecret)

export async function searchTracks(query: string, limit = 10): Promise<Track[]>
// GET https://api.spotify.com/v1/search?q=...&type=track&limit=10

export async function addToQueue(uri: string): Promise<void>
// POST https://api.spotify.com/v1/me/player/queue?uri=...
```

Track type:
```ts
type Track = {
  uri: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | undefined;
};
```

---

## sse.ts — SSE Broadcast Manager

```ts
// Module-level set of active SSE streams
const clients = new Set<ReadableStreamDefaultController>();

export function addClient(controller: ReadableStreamDefaultController): void
export function removeClient(controller: ReadableStreamDefaultController): void

export function broadcast(event: string, data: unknown): void
// Sends: `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
// to all clients in the set
```

---

## index.tsx — Main App

### Hono Setup
```ts
import { Hono } from "hono";

const app = new Hono();
const PORT = parseInt(process.env.PORT || "3000");

export default {
  port: PORT,
  fetch: app.fetch,
};
```

### Middleware helpers
```ts
// viewerAuth: checks c.req.header('x-viewer-password') === process.env.VIEWER_PASSWORD
// adminAuth: checks c.req.header('x-admin-password') === process.env.ADMIN_PASSWORD
// Both return 401 JSON on failure, call next() on success
```

### API Routes — all identical endpoints as the current Express backend

#### POST /api/auth/verify
- Body: `{ password, type }` — type is `'viewer'` or `'admin'`
- Compare against env vars, return `{ valid: true }` or 401

#### POST /api/time/log
- Requires viewerAuth
- Body: `{ viewerId }`
- Call `upsertViewer(viewerId, 1, REGULAR_THRESHOLD)` — creates if not exists, increments 1 min
- Return `{ viewer, isRegular, promoted }`
- `promoted` = true if viewer just crossed threshold this tick

#### POST /api/time/set-username
- Requires viewerAuth
- Body: `{ viewerId, username }`
- Call `setViewerUsername(viewerId, username)`
- Return `{ viewer }`

#### GET /api/time/viewer/:id
- Requires viewerAuth
- Return `{ viewer }` (null if not found)

#### GET /api/requests/search?q=
- Requires viewerAuth
- Call `searchTracks(q)` from spotify.ts
- Return `{ tracks }`

#### POST /api/requests/submit
- Requires viewerAuth
- Body: `{ viewerId, type, content, spotifyUri?, artist? }`
- Get viewer, check `is_regular`
- If regular + type=song: status = 'approved', else 'pending'
- Insert request via `insertRequest()`
- If auto-approved song: call `addToQueue(spotifyUri)`, call `setOverlay(...)`, broadcast SSE event `'request'` with the approved request data
- Return `{ request, autoApproved, message }`

#### GET /api/requests/approved
- Requires viewerAuth
- Return `{ requests: getApprovedRequests(50) }`

#### GET /api/admin/requests?status=
- Requires adminAuth
- Return `{ requests: getRequests(status) }`

#### POST /api/admin/requests/:id/approve
- Requires adminAuth
- Get request, update status to 'approved'
- If song + spotifyUri: call `addToQueue(spotifyUri)`, call `setOverlay(...)`
- Broadcast SSE event `'request'` with the approved request data
- Return `{ success: true, request }`

#### POST /api/admin/requests/:id/reject
- Requires adminAuth
- Update status to 'rejected'
- Return `{ success: true }`

#### GET /api/admin/viewers
- Requires adminAuth
- Return `{ viewers: getAllViewers() }`

#### POST /api/admin/viewers/:id/toggle-regular
- Requires adminAuth
- Call `toggleViewerRegular(id)`
- Return `{ viewer }`

#### GET /api/overlay/current
- No auth required (used by OBS browser source)
- Return plain text: `getOverlay()`
- Set Content-Type: text/plain

#### POST /api/admin/overlay/clear
- Requires adminAuth
- Call `clearOverlay()`
- Return `{ success: true }`

#### GET /api/events — SSE endpoint
```ts
app.get('/api/events', (c) => {
  const stream = new ReadableStream({
    start(controller) {
      addClient(controller);
      // Send keep-alive comment every 30s
    },
    cancel(controller) {
      removeClient(controller);
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
});
```

---

### Frontend Pages — Hono JSX

Each page is a full HTML document returned from a GET route. Client-side interactivity is vanilla JavaScript in `<script>` tags.

#### Shared HTML shell (reusable JSX component)
- Include Google Fonts: Orbitron, Rajdhani
- Include all CSS inline (see CSS section below)
- Include the fire/cyber aesthetic: `--bg-dark: #0a0a0f`, `--primary: #ff4d00`, `--secondary: #00d4ff`

---

#### GET / — Gate Page

HTML mirrors `frontend/src/pages/Gate.jsx` and `Gate.css`.

Client-side JS behavior:
1. On load: check `sessionStorage.getItem('viewerPassword')` or `'adminPassword'` — if set, redirect to `/hub` or `/admin`
2. Read `?admin=true` from query string to show "Admin Access" vs "Viewer Hub"
3. Form submit: `POST /api/auth/verify` with `{ password, type }`
4. On success:
   - Viewer: store `sessionStorage.setItem('viewerPassword', password)`, ensure `localStorage.getItem('viewerId')` exists (generate `crypto.randomUUID()` if not), redirect to `/hub`
   - Admin: store `sessionStorage.setItem('adminPassword', password)`, redirect to `/admin`
5. On failure: show error "Invalid password"
6. Show "Admin Login" link at bottom for viewer gate: `/?admin=true`

---

#### GET /hub — Hub Page

HTML mirrors `frontend/src/pages/Hub.jsx` and `Hub.css`.

Client-side JS behavior:
1. On load: if no `sessionStorage.getItem('viewerPassword')`, redirect to `/`
2. Get `viewerId = localStorage.getItem('viewerId')`
3. `GET /api/time/viewer/:viewerId` → set viewer state (username, is_regular, total_minutes)
4. If viewer has no username, show username prompt modal
5. `GET /api/requests/approved` → populate live feed list
6. Start SSE: `new EventSource('/api/events')`
   - On `'request'` event: prepend new item to live feed (max 50 items)
7. **Loyalty heartbeat**: Using Page Visibility API, every 60 seconds while tab is visible:
   - `POST /api/time/log` with `{ viewerId }`
   - Update displayed time badge
   - If `result.promoted === true`: show "You are now a Regular!" banner
8. **Tabs**: "Request" tab and "Live Feed" tab (toggle visibility with CSS display)
9. **Song search**: form submits `GET /api/requests/search?q=...`, renders track list
10. **Track select**: click to select, then "Submit Request" button
11. **Submit song**: `POST /api/requests/submit` with song data, show feedback message
12. **Submit message**: textarea form, `POST /api/requests/submit` with type='message'
13. **Username prompt**: form `POST /api/time/set-username`, or "Skip" button

Helper functions in the inline script:
- `formatTime(minutes)` → "Xh Ym"
- `getViewerHeaders()` → `{ 'Content-Type': 'application/json', 'x-viewer-password': sessionStorage.getItem('viewerPassword') }`

---

#### GET /admin — Admin Dashboard

HTML mirrors `frontend/src/pages/Admin.jsx` and `Admin.css`.

Client-side JS behavior:
1. On load: if no `sessionStorage.getItem('adminPassword')`, redirect to `/?admin=true`
2. Load data for active tab on tab switch
3. **Tabs**: pending, approved, rejected, all, viewers — each calls the appropriate API
4. Start SSE: `new EventSource('/api/events')`
   - On `'request'` event: if on a requests tab (not viewers), refresh the current tab's data
5. **Approve**: `POST /api/admin/requests/:id/approve` → update row in DOM
6. **Reject**: `POST /api/admin/requests/:id/reject` → update row in DOM
7. **Toggle Regular**: `POST /api/admin/viewers/:id/toggle-regular` → update row in DOM
8. **Clear Overlay**: `POST /api/admin/overlay/clear`
9. **Logout**: `sessionStorage.removeItem('adminPassword')`, redirect to `/?admin=true`

Helper:
- `getAdminHeaders()` → `{ 'Content-Type': 'application/json', 'x-admin-password': sessionStorage.getItem('adminPassword') }`
- `formatTime(minutes)`, `formatDate(dateStr)`

---

## CSS

Consolidate all styles from these four files into one inline `<style>` block in the shared HTML shell:
- `frontend/src/index.css`
- `frontend/src/pages/Gate.css`
- `frontend/src/pages/Hub.css`
- `frontend/src/pages/Admin.css`

Preserve everything exactly — all CSS variables, all class names, all animations.

---

## SSE Event Format

Broadcast format from sse.ts:
```
event: request
data: {"id":"...","type":"song","content":"...","artist":"...","status":"approved","viewer":{"username":"..."}}

```
(note the blank line at the end — required by SSE spec)

Client listens with:
```js
const es = new EventSource('/api/events');
es.addEventListener('request', (e) => {
  const req = JSON.parse(e.data);
  // prepend to feed list
});
```

---

## Overlay (SQLite-backed)

`setOverlay` in db.ts constructs and stores the string:
```ts
db.run("UPDATE overlay SET content = ? WHERE id = 1", [
  `Requested by ${username}: ${songName}${artist ? ` - ${artist}` : ''}`
]);
```

`clearOverlay`: `db.run("UPDATE overlay SET content = '' WHERE id = 1")`

`getOverlay`: `db.query("SELECT content FROM overlay WHERE id = 1").get()?.content ?? ''`

`GET /api/overlay/current` returns this as `text/plain` — no auth, used by OBS.

---

## Environment Variables

**Remove** these (no longer needed):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `OVERLAY_FILE_PATH`

**Keep** these (same as before):
- `VIEWER_PASSWORD`
- `ADMIN_PASSWORD`
- `REGULAR_THRESHOLD_MINUTES` (default: 18000)
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`
- `PORT` (default: 3000)

---

## Notes for Cursor

- **Do not use** `express`, `cors`, `dotenv`, `@supabase/supabase-js`, `spotify-web-api-node`, `react`, `react-dom`, `react-router-dom`, or `vite` — these are all gone.
- **Bun provides natively**: SQLite (`bun:sqlite`), `crypto.randomUUID()`, `fetch`, env vars via `process.env`.
- **`is_regular` in SQLite is `0` or `1`** — cast to boolean in JSON responses: `is_regular: Boolean(viewer.is_regular)`.
- **`upsertViewer`**: use `INSERT OR IGNORE` then `UPDATE`, or `INSERT ... ON CONFLICT DO UPDATE SET`.
- **The Zo site runs persistently** — `the-jam.db` persists across requests.
- **SSE keep-alive**: send `": keep-alive\n\n"` every 30 seconds per client to prevent timeouts.
- **Preserve the fire/cyber aesthetic** — Orbitron headings, Rajdhani body, `#ff4d00` orange, `#00d4ff` cyan.
