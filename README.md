# WyldePhyre Viewer Hub

One link for a live stream. Viewers create an account with the name they use in chat, request Spotify songs, send messages, and earn loyalty time. The host approves requests and can show the consolidated Twitch, YouTube, Rumble, and X chat captured by [Social Stream Ninja](https://github.com/steveseguin/social_stream).

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
# ADMIN_PASSWORD is required. VIEWER_PASSWORD is an optional shared site gate.
bun run dev
```

Open `http://localhost:3000`. The process refuses to start if `ADMIN_PASSWORD` is empty. `VIEWER_PASSWORD` may be empty.

```bash
bun test
bash scripts/smoke.sh
```

## Pages

| URL | Who |
| --- | --- |
| `/` | Shared site password, when `VIEWER_PASSWORD` is set. Otherwise redirects to `/login`. `/?admin=true` is the admin gate. |
| `/login` | Create a viewer account or log in. |
| `/hub` | Song requests, messages, loyalty time, approved feed, live chat. |
| `/admin` | Approve or reject requests, regulars, viewer accounts, clear the OBS line, live chat. |
| `/overlay` | OBS browser source. Transparent text. Also `GET /api/overlay/current` as plain text. |

The admin password stays in `sessionStorage` and is sent as `x-admin-password`. When the shared site gate is on, that password stays in `sessionStorage` and is sent as `x-viewer-password`. The viewer account is a separate `jam_session` cookie (`HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS). The Social Stream session id and password stay in server environment variables and are never written into the page.

## Viewer accounts

Song and message requests require a logged-in viewer. The name on the request, in the admin queue, on the overlay, and in the Social Stream Ninja TTS forward is the account display name, not a name typed into the request form.

Sign-up asks for:

- Display name, labelled "Your Twitch / YouTube / Rumble / X username" (2–40 characters, unique ignoring case)
- Platform: twitch, youtube, rumble, x, kick, or other
- Password, at least 8 characters, stored with Bun's argon2id hash
- Email, optional

`VIEWER_PASSWORD` is only a shared site gate. If it is set, viewers must enter it before the login page, and viewer API calls still send `x-viewer-password`. If it is empty, the process still starts and `/` goes straight to account login. Either way, the shared password is not an identity: it cannot submit a request by itself.

Sessions last 30 days. Logout is `POST /api/auth/logout`. Login and sign-up are rate limited per IP. There is no forgot-password flow. Cap can disable or delete an account from the admin Accounts tab. A disabled account cannot log in or request. Deleting an account removes the login and keeps older requests readable under the same display name.

The `users` table is the identity to build on later (loyalty points, a chat bot, Twitch/YouTube/X OAuth, a Rumble verification code). Those links are not built yet. A future `linked_identities` table should reference `users.id`. The platform column on the account is the name they typed, not a verified login.

Admin Pending refreshes when a request event arrives and, as a fallback, every 30 seconds. Live Chat still follows the Social Stream socket and also polls `/api/chat/recent` every 5 seconds. Both pause while the browser tab is hidden. The intervals are `PENDING_POLL_MS` and `CHAT_POLL_MS` in `pages.ts`.

## OBS overlay

`GET /api/overlay/current` stays public plain text. The stored now-playing line (`Requested by Name: Song - Artist`) is unchanged, including Clear Overlay.

Under that, when Spotify has an active player, one more line lists the next three tracks in Spotify's queue:

```text
Up next: Song A – Artist · Song B – Artist (Requested by Nia) · Song C – Artist
```

`(Requested by …)` is added only when that Spotify track URI matches an approved Jam song request. Songs queued from Spotify itself have no credit. If Spotify has no active player, or the call fails, that line is left off. The now-playing line still shows. Spotify is read at most once every 12 seconds (`QUEUE_CACHE_MS`), and the cache is dropped when a Jam song is queued so the next read is fresh.

`/overlay` is a transparent page for an OBS browser source. It reloads the text every 12 seconds and when a song request event arrives.

The refresh token needs `user-read-playback-state` (already used for queueing) and `user-read-currently-playing`. If the up-next line never appears while music is playing, regenerate the token with those scopes.

## Live chat

Social Stream Ninja is GPL-3.0 and is not copied into this repo. The Bun process joins SSN's hosted websocket as a listener and stores a short plain-text history. The hub renders that text with the same HTML escaping used for song requests.

Setup for the streaming PC and for Niner is in [docs/DEPLOY-ZO.md](docs/DEPLOY-ZO.md). Chat is off until `SSN_SESSION_ID` is set.

Approving a viewer **message** (not a song) also forwards that text to Social Stream Ninja for the dock's text-to-speech. The chat name is the account display name. The forward is skipped when `SSN_SESSION_ID` is unset, and a failure to reach SSN does not fail the approval. Which SSN toggles have to be on so the dock actually speaks the line is in the deploy doc.

## Environment

| Variable | Purpose |
| --- | --- |
| `VIEWER_PASSWORD` | Optional shared site gate. Empty turns the gate off. Not an identity. |
| `ADMIN_PASSWORD` | Required. Admin gate. |
| `COOKIE_SECURE` | `1` forces the session cookie `Secure` flag. Empty follows HTTPS. `0` leaves it off for local HTTP. |
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
