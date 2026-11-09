# Deploy The Jam on Zo (Niner)

This is the runbook for hosting this repo on Cap's Zo computer. Do the steps on Niner. Nothing here deploys from another machine.

The app is already a Zo-style site: one Bun process, Hono, server-rendered pages, and a SQLite file (`the-jam.db`) in the working directory. There is no separate frontend build.

## What has to stay running

Register an **HTTP service**. Zo restarts the machine for updates, and a process started in a terminal does not come back. A registered service does.

Use a public service. Viewers open the link from chat and do not have Zo accounts. They create a viewer account on the site (their chat username and a password) before they can request a song or send a message. If `VIEWER_PASSWORD` is set, they also enter that shared password first. It is a site gate, not their identity.

A private Zo URL (`*.zo.computer`) only works for people signed into the workspace. That is the wrong visibility for the viewer hub.

## 1. Get the code onto Niner

In the Zo terminal (or SSH):

```bash
cd /home/workspace
git clone https://github.com/wyldephyre/The-Jam.git
cd The-Jam
bun --version || curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
bun install
```

Zo's own site tool already includes Bun. The `curl` line is only if `bun` is missing from that shell.

## 2. Secrets

```bash
cp .env.example .env
chmod 600 .env
```

Edit `.env`. Bun loads it on `bun run start` and does not override variables Zo already set.

Required or the process exits:

- `ADMIN_PASSWORD`

Optional:

- `VIEWER_PASSWORD` — shared site gate in front of account login. Leave it empty to send viewers straight to `/login`. Clearing it does not turn off account login.
- `COOKIE_SECURE` — set to `1` on the public HTTPS site so the `jam_session` cookie is always marked Secure. Leave it empty if Zo sends `X-Forwarded-Proto: https` (the app will mark the cookie Secure from that). Set `0` only for plain HTTP on localhost. If login succeeds in the browser but the hub immediately asks for login again, set `COOKIE_SECURE=1` and restart.

Needed for song search and queue (the site still boots without them; search returns an error until they are set):

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`

Needed for live chat. Leave `SSN_SESSION_ID` empty to run without chat:

- `SSN_SESSION_ID` — the `session` value from Social Stream Ninja. Secret.
- `SSN_PASSWORD` — only if that SSN session has a password. Secret. The server adds it to the websocket join and never to the page. The hosted chat channel is selected by session id. If you set a password only for the peer-to-peer overlay and chat never shows up, clear `SSN_PASSWORD` and restart.
- `SSN_SERVER_URL` — leave the default `wss://io.socialstream.ninja` unless SSN's own websocket is on this same machine.
- `SSN_PLATFORMS` — default `twitch,youtube,rumble,x,twitter`.

Do not put these values in `zosite.json`. That file is committed.

You can set the same keys in the service's environment panel instead of `.env`. Those values override `.env`. `PORT` is set by Zo to the service's local port; the app reads `PORT`.

## 3. Register the service

Open **Sites → Services** and create a service (or ask Zo to register one) with:

| Setting | Value |
| --- | --- |
| Label | `the-jam` |
| Mode | `http` |
| Public | yes |
| Local port | `3000` (Zo injects this as `PORT`) |
| Entrypoint | `bun run start` |
| Working directory | `/home/workspace/The-Jam` |
| Environment | the variables from step 2, if you did not use `.env` |

Zo then gives two URLs. Use the **HTTP Proxy URL**. It looks like:

```text
the-jam-<your-zo-handle>.zocomputer.io
```

The machine name Niner is not the handle. The handle is the one on the Zo account. An older note in this repo guessed the handle `zo`, which would make the URL `the-jam-zo.zocomputer.io`. Check the service page rather than assuming that.

Confirm from Niner before sharing the link:

```bash
curl -sS http://127.0.0.1:3000/api/health
```

Expect `{"ok":true}`. If Zo assigned a different port, use that port. `PORT` in the service must be the port the process binds, which this app does automatically.

## 4. Custom domain (optional, paid plan)

Zo custom domains are subdomains only. `jam.example.com` works. The apex `example.com` does not.

1. On the service, **Custom Domains → Add**, and enter the subdomain.
2. At the DNS host, add a CNAME:

   | Type | Name | Target |
   | --- | --- | --- |
   | CNAME | the subdomain label (`jam` for `jam.example.com`) | `cname.zocomputer.io` |

3. If DNS is on Cloudflare, set the record to **DNS only** (grey cloud).
4. Wait until Zo shows **Active** (usually under 15 minutes). Use **Verify now** if it stays on Pending CNAME.

Free Zo plans have no custom-domain slots. Basic has 3, Pro 5, Ultra 10.

## 5. Social Stream Ninja, on the streaming PC

The website does not log into Twitch, YouTube, Rumble, or X. Social Stream Ninja captures those chats. Rumble Studio sends the video to each platform; it does not send chat to this site.

On the computer where the chats are open (the streaming PC, not necessarily Niner):

1. Install the [Social Stream Ninja desktop app or browser extension](https://socialstream.ninja/docs/download.html).
2. Open the chats SSN supports for Twitch, YouTube, Rumble, and X, and confirm they show in the SSN dock. Rumble chat is the pop-out chat. X messages use source type `x` (or `twitter` if SSN's "detweet" option is on).
3. In **Global settings → Mechanics**, turn on:
   - **Enable remote API control of extension**
   - **Send chat messages to API server** (this is the one that publishes chat on channel 4)
4. Copy the session id from the generated dock link (`session=`). If a password is set, copy that too.
5. Put them in Niner's `.env` as `SSN_SESSION_ID` and `SSN_PASSWORD`. Restart the service after changing them.
6. Send a test message in one chat. The hub's **Live Chat** tab and the admin **Live Chat** tab should show it as plain text.

Keep SSN and those chat pages open while live. A closed or sleeping source stops capture.

### Speaking an approved Jam message

Approving a **message** request sends that text to Social Stream Ninja so the dock can read it aloud. Song approvals stay on the Spotify path. The chat name is the viewer's account display name (the Twitch / YouTube / Rumble / X username they signed up with). In the dock the platform label is `external`. The payload also includes `source` set to `The Jam`. This is injected as incoming chat inside SSN. It is not posted into Twitch, YouTube, Rumble, or X.

Nothing is sent when `SSN_SESSION_ID` is empty. If SSN cannot be reached, the approval still succeeds.

For TTS to actually speak the line, on the streaming PC:

1. Leave **Enable remote API control of extension** on. That is the switch that lets The Jam hand the message to the extension. The extension then delivers it to the dock the same way it delivers captured chat.
2. Leave the SSN dock open while you are live.
3. Turn **TTS on in the dock** (the TTS control in the dock menu). With that on, the dock reads each visible incoming message, including these Jam lines. TTS on the featured overlay only (the featured page, or `featured.html` with `&speech`) speaks messages you feature. Approving a Jam message does not feature it, so featured-only TTS stays quiet.
4. Clear filters that would hide or skip this source. The line is not a donation, a membership, or a `!say` command, and its source type is `external`:
   - Dock display filters such as show-Twitch-only, donations only, or members only hide the row, and a hidden row is not spoken.
   - TTS filters do the same: donations only (`ttsdonos` on the dock URL), members only (`membertts`), a source allow-list (`ttssources`) that does not include `external`, or "only bots / mods / VIPs".
   - A TTS command such as `!say` (`ttscommand`) speaks those command messages. If the dock TTS toggle itself is off, Jam messages are not spoken, because they are not chat commands.
   - The extension's members-only chat filter drops the message before it reaches the dock.

Approve one test message from the admin page and confirm it shows in the dock under source `external` and that the dock voice reads the viewer name and the text. Song approvals do not go to SSN.

Leave SSN's session id and password out of OBS links you post in public chat. Viewers of The Jam never receive them; the Bun process joins `wss://io.socialstream.ninja` itself and only forwards plain text.

### Local websocket instead of the hosted relay

Use this only when the SSN websocket and The Jam run on the same machine. New SSN desktop builds listen on port **3003** (`ws://127.0.0.1:3003`). Older builds use port 3000, which collides with this app's default `PORT`. Do not point `SSN_SERVER_URL` at port 3000 if The Jam is bound there.

```bash
SSN_SERVER_URL=ws://127.0.0.1:3003
```

The default hosted URL is the right one when capture stays on the streaming PC and the site runs on Niner.

## 6. Database migration

Pulling this version and restarting is enough. Do not delete `the-jam.db`. On startup the process runs an in-place migration:

- New tables `users` and `sessions` are created if missing.
- `requests` gains a nullable `user_id` column if it does not already have one. Existing rows are left as they are (`user_id` stays null) and still show the old viewer username.
- Loyalty rows in `viewers` are not rewritten.

The migration is safe to run more than once. There is no manual SQL step. A restart does not wipe the file.

New song and message requests store `user_id` and use the account display name. Old requests keep working.

## 7. After it is up

- Viewer link: `https://<public-host>/` (shared gate if `VIEWER_PASSWORD` is set, then account login)
- Account login: `https://<public-host>/login`
- Admin: `https://<public-host>/?admin=true` — Pending refreshes on its own. Accounts tab can disable or delete a viewer.
- OBS now-playing text: `https://<public-host>/api/overlay/current`
- OBS browser source: `https://<public-host>/overlay`
- SQLite data is `the-jam.db` in the working directory. It survives a service restart. Do not commit it. Do not set `JAM_DB_PATH` on Niner.

The up-next line is added under the existing now-playing line when Spotify has an active player. It lists the next three queued tracks. Approved Jam songs get `(Requested by <display name>)` when the Spotify URI matches. If Spotify errors or nothing is playing, that line is omitted and the now-playing line is unchanged. The Spotify refresh token needs `user-read-playback-state` and `user-read-currently-playing`.

Song requests, loyalty time, and the admin queue behave as before, except a request now has to come from a logged-in account. Live chat is an extra tab. It stays empty, with "Chat is not configured on the server", until `SSN_SESSION_ID` is set and SSN is publishing. Pending and live chat also poll (30s and 5s) if the live socket misses an update.

## What Cap still has to do at deploy

- Pull this branch and restart the service (`bun run start`). Leave `the-jam.db` in place.
- Keep `ADMIN_PASSWORD`. Decide whether `VIEWER_PASSWORD` stays as a shared gate or is cleared.
- Set `COOKIE_SECURE=1` if the public site is HTTPS and the login cookie does not stick.
- No new required secrets. Spotify and SSN env vars are unchanged.
- Ask one viewer to create an account with their chat username, send a message, and confirm the admin queue and (after approval) the SSN dock show that name.
- While a song is playing in Spotify, open `/overlay` and confirm the up-next line. If it never appears, the refresh token is missing a playback scope.
- There is no password-reset email. Disable or delete an account from Admin → Accounts if someone is locked out, and they can sign up again.

## What Cap still has to decide

- Whether the shared `VIEWER_PASSWORD` stays, and the admin password and Spotify app credentials.
- The SSN session id (and password, if he set one), taken from his own SSN install.
- That SSN will keep running on the streaming PC with the two toggles above, plus dock TTS on if approved Jam messages should be spoken. This repo does not run capture. See "Speaking an approved Jam message" above.
- The Zo account handle, which determines `the-jam-<handle>.zocomputer.io`.
- Whether the public host stays on `zocomputer.io` or gets a paid-plan subdomain, and which DNS host holds the CNAME.
