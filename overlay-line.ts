// Pure formatting for the OBS "up next" line. No Spotify calls here.

export const UP_NEXT_COUNT = 3;
export const SONG_NAME_MAX = 32;
export const ARTIST_NAME_MAX = 24;
export const REQUESTER_NAME_MAX = 24;
export const UP_NEXT_LINE_MAX = 160;

export type QueueSong = {
  uri: string;
  name: string;
  artist: string;
};

export type SongCredit = {
  uri: string;
  requester: string | null;
};

export function normalizeTrackUri(uri: string): string {
  const trimmed = uri.trim();
  const match = /^spotify:track:(.+)$/i.exec(trimmed);
  if (!match?.[1]) return trimmed;
  return `spotify:track:${match[1]}`;
}

export function oneLine(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
}

export function ellipsize(value: string, max: number): string {
  if (max <= 0) return "";
  if (value.length <= max) return value;
  if (max === 1) return "…";
  return value.slice(0, max - 1).trimEnd() + "…";
}

// Newest credit should be first. The first non-empty name for a URI wins.
export function formatUpNext(queue: QueueSong[], credits: SongCredit[]): string {
  const byUri = new Map<string, string>();
  for (const credit of credits) {
    if (typeof credit.uri !== "string") continue;
    const uri = normalizeTrackUri(credit.uri);
    const requester = ellipsize(oneLine(credit.requester ?? ""), REQUESTER_NAME_MAX);
    if (!uri || !requester || byUri.has(uri)) continue;
    byUri.set(uri, requester);
  }

  const parts: string[] = [];
  for (const song of queue) {
    if (parts.length >= UP_NEXT_COUNT) break;
    const name = ellipsize(oneLine(song.name ?? ""), SONG_NAME_MAX);
    if (!name) continue;
    const artist = ellipsize(oneLine(song.artist ?? ""), ARTIST_NAME_MAX);
    let piece = artist ? `${name} – ${artist}` : name;
    const requester = byUri.get(normalizeTrackUri(song.uri ?? ""));
    if (requester) piece += ` (Requested by ${requester})`;
    parts.push(piece);
  }
  if (parts.length === 0) return "";
  return ellipsize(`Up next: ${parts.join(" · ")}`, UP_NEXT_LINE_MAX);
}

// Now-playing text is returned unchanged when there is nothing up next.
export function composeOverlay(nowPlaying: string, upNext: string): string {
  const next = oneLine(upNext);
  if (!next) return nowPlaying ?? "";
  const now = nowPlaying ?? "";
  if (!now.trim()) return next;
  return `${now.replace(/\s+$/, "")}\n${next}`;
}

export function buildOverlayText(nowPlaying: string, queue: QueueSong[] | null, credits: SongCredit[]): string {
  const upNext = queue && queue.length > 0 ? formatUpNext(queue, credits) : "";
  return composeOverlay(nowPlaying, upNext);
}
