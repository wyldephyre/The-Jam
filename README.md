# WyldePhyre Viewer Hub

One link for a live stream. Viewers enter a shared password, request Spotify songs, send messages, and earn loyalty time. The host approves requests and can show the consolidated Twitch, YouTube, Rumble, and X chat captured by [Social Stream Ninja](https://github.com/steveseguin/social_stream).

## Stack

- **App:** [Hono](https://hono.dev) on [Bun](https://bun.sh). Pages are server-rendered HTML with a small inline script.
- **Data:** SQLite (`the-jam.db`) through `bun:sqlite`
- **Live updates:** Server-Sent Events (`GET /api/events` for requests, `GET /api/chat/stream` for chat)
- **Host:** a Zo Computer HTTP service. See [docs/DEPLOY-ZO.md](docs/DEPLOY-ZO.md).

The old React/Vite/Express/Supabase layout is gone. `supabase/schema.sql` is kept as a reference only.

## Run locally

```bash
bun install
cp .env.example .env
# set VIEWER_PASSWORD and ADMIN_PASSWORD at minimum
bun run dev
```

Open `http://localhost:3000`. The process refuses to start if either password is empty.

```bash
bun test
bash scripts/smoke.sh
```

## Pages

| URL | Who |
| --- | --- |
| `/` | Viewer password gate. `/?admin=true` is the admin gate. |
| `/hub` | Song requests, messages, loyalty time, approved feed, live chat. |
| `/admin` | Approve or reject requests, regulars, clear the OBS line, live chat. |

API calls send `x-viewer-password` or `x-admin-password`. Those values stay in `sessionStorage` in the browser. The Social Stream session id and password stay in server environment variables and are never written into the page.

`GET /api/overlay/current` is plain text for an OBS browser source. It is not password protected, same as before.

## Live chat

Social Stream Ninja is GPL-3.0 and is not copied into this repo. The Bun process joins SSN's hosted websocket as a listener and stores a short plain-text history. The hub renders that text with the same HTML escaping used for song requests.

Setup for the streaming PC and for Niner is in [docs/DEPLOY-ZO.md](docs/DEPLOY-ZO.md). Chat is off until `SSN_SESSION_ID` is set.

## Environment

| Variable | Purpose |
| --- | --- |
| `VIEWER_PASSWORD` | Required. Viewer gate. |
| `ADMIN_PASSWORD` | Required. Admin gate. |
| `REGULAR_THRESHOLD_MINUTES` | Minutes until auto-regular. Default 18000 (300 hours). |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REFRESH_TOKEN` | Song search and queue. |
| `PORT` | Listen port. Default 3000. Zo sets this for a service. |
| `SSN_SESSION_ID` | Secret SSN session id. Empty disables chat. |
| `SSN_PASSWORD` | Secret SSN session password, if one is set. |
| `SSN_SERVER_URL` | Default `wss://io.socialstream.ninja`. |
| `SSN_PLATFORMS` | Default `twitch,youtube,rumble,x,twitter`. `*` allows every source. |
| `SSN_HIDE_BOTS` | `1` drops messages SSN marks as bots. |

## License

MIT. Social Stream Ninja itself is GPL-3.0 and is used as a separate program.
