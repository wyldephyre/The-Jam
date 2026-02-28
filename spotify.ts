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
