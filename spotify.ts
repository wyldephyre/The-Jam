export type Track = {
  uri: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | undefined;
};

let accessToken = "";
let tokenExpiresAt = 0;

async function ensureAccessToken(): Promise<void> {
  if (Date.now() < tokenExpiresAt - 60000) {
    return;
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Spotify env vars");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token refresh failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
}

export async function searchTracks(query: string, limit = 10): Promise<Track[]> {
  await ensureAccessToken();
  const url = `https://api.spotify.com/v1/search?${new URLSearchParams({
    q: query,
    type: "track",
    limit: String(limit),
  })}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify search failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    tracks?: { items?: Array<{
      uri: string;
      name: string;
      artists?: Array<{ name: string }>;
      album?: { name: string; images?: Array<{ url: string }> };
    }> };
  };
  const items = data.tracks?.items ?? [];
  return items.map((track) => ({
    uri: track.uri,
    name: track.name,
    artist: track.artists?.map((a) => a.name).join(", ") ?? "",
    album: track.album?.name ?? "",
    albumArt: track.album?.images?.[0]?.url,
  }));
}

export type SpotifyQueueTrack = {
  uri: string;
  name: string;
  artist: string;
};

export const QUEUE_CACHE_MS = 12_000;

function trackFromItem(item: unknown): SpotifyQueueTrack | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const type = typeof row.type === "string" ? row.type : "";
  const rawUri = typeof row.uri === "string" ? row.uri.trim() : "";
  if (type === "episode" || type === "ad") return null;
  if (!/^spotify:track:/i.test(rawUri)) return null;
  const name = typeof row.name === "string" ? row.name : "";
  if (!name.trim()) return null;
  const artists = Array.isArray(row.artists)
    ? row.artists
        .map((artist) => {
          if (!artist || typeof artist !== "object") return "";
          const artistName = (artist as { name?: unknown }).name;
          return typeof artistName === "string" ? artistName : "";
        })
        .filter(Boolean)
        .join(", ")
    : "";
  const id = /^spotify:track:(.+)$/i.exec(rawUri)?.[1] ?? "";
  return { uri: `spotify:track:${id}`, name, artist: artists };
}

// Upcoming tracks only. The song already playing is left off this list.
// null means "don't show an up-next line" (no player, auth error, or rate limit).
export function tracksFromQueueResponse(status: number, payload: unknown): SpotifyQueueTrack[] | null {
  if (status === 204 || status === 202 || status === 404) return null;
  if (status !== 200) return null;
  if (!payload || typeof payload !== "object") return [];
  const body = payload as { currently_playing?: unknown; queue?: unknown };
  const current = trackFromItem(body.currently_playing);
  const items = Array.isArray(body.queue) ? body.queue : [];
  const tracks: SpotifyQueueTrack[] = [];
  for (const item of items) {
    const track = trackFromItem(item);
    if (!track) continue;
    if (current && track.uri === current.uri) continue;
    tracks.push(track);
  }
  return tracks;
}

type QueueLoader = () => Promise<SpotifyQueueTrack[] | null>;

let queueCache: { expiresAt: number; value: SpotifyQueueTrack[] | null } | null = null;
let queueFlight: Promise<SpotifyQueueTrack[] | null> | null = null;
let lastQueueLog = "";

export function invalidateQueueCache(): void {
  queueCache = null;
}

export function resetQueueCacheForTests(): void {
  queueCache = null;
  queueFlight = null;
  lastQueueLog = "";
  accessToken = "";
  tokenExpiresAt = 0;
}

function noteQueueStatus(status: number): void {
  const key = String(status);
  if (lastQueueLog === key) return;
  lastQueueLog = key;
  if (status === 200 || status === 204 || status === 404) return;
  console.error(`Spotify queue unavailable (${status})`);
}

async function fetchSpotifyQueue(): Promise<SpotifyQueueTrack[] | null> {
  try {
    await ensureAccessToken();
  } catch {
    return null;
  }
  let res: Response;
  try {
    res = await fetch("https://api.spotify.com/v1/me/player/queue", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return null;
  }
  noteQueueStatus(res.status);
  if (res.status !== 200) return tracksFromQueueResponse(res.status, null);
  try {
    const payload = (await res.json()) as unknown;
    return tracksFromQueueResponse(res.status, payload);
  } catch {
    return null;
  }
}

// One Spotify read per QUEUE_CACHE_MS, shared by overlapping OBS polls.
// Pass a loader in tests. Failures are cached too so a down API is not retried on every hit.
export async function getUpcomingTracks(loader: QueueLoader = fetchSpotifyQueue, now = Date.now()): Promise<SpotifyQueueTrack[] | null> {
  if (queueCache && now < queueCache.expiresAt) return queueCache.value;
  if (!queueFlight) {
    const flight = loader()
      .then((value) => {
        queueCache = { expiresAt: Date.now() + QUEUE_CACHE_MS, value };
        return value;
      })
      .catch(() => {
        queueCache = { expiresAt: Date.now() + QUEUE_CACHE_MS, value: null };
        return null;
      })
      .finally(() => {
        if (queueFlight === flight) queueFlight = null;
      });
    queueFlight = flight;
  }
  return queueFlight;
}

export async function addToQueue(uri: string): Promise<void> {
  await ensureAccessToken();
  const url = `https://api.spotify.com/v1/me/player/queue?${new URLSearchParams({ uri })}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Spotify addToQueue failed: ${res.status} ${text}`);
  }
}
