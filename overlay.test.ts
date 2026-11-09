import { beforeEach, describe, expect, test } from "bun:test";
import {
  UP_NEXT_LINE_MAX,
  buildOverlayText,
  composeOverlay,
  formatUpNext,
  type QueueSong,
  type SongCredit,
} from "./overlay-line";
import {
  QUEUE_CACHE_MS,
  getUpcomingTracks,
  resetQueueCacheForTests,
  tracksFromQueueResponse,
  type SpotifyQueueTrack,
} from "./spotify";
import { ADMIN_SCRIPT, CHAT_POLL_MS, HUB_SCRIPT, OVERLAY_REFRESH_MS, OVERLAY_SCRIPT, PENDING_POLL_MS } from "./pages";

const queue: QueueSong[] = [
  { uri: "spotify:track:aaa", name: "Song A", artist: "Artist" },
  { uri: "spotify:track:bbb", name: "Song B", artist: "Artist" },
  { uri: "spotify:track:ccc", name: "Song C", artist: "Artist" },
  { uri: "spotify:track:ddd", name: "Song D", artist: "Artist" },
];

describe("up next line", () => {
  test("merges the next three Spotify songs and credits only URI matches", () => {
    const credits: SongCredit[] = [
      { uri: "spotify:track:bbb", requester: "Nia" },
      { uri: "spotify:track:zzz", requester: "Someone Else" },
      { uri: "Spotify:track:ccc", requester: "Old Credit" },
      { uri: "spotify:track:ccc", requester: "Newer Should Lose" },
    ];
    expect(formatUpNext(queue, credits)).toBe(
      "Up next: Song A – Artist · Song B – Artist (Requested by Nia) · Song C – Artist (Requested by Old Credit)"
    );
  });

  test("leaves songs Cap queued himself unmarked", () => {
    expect(formatUpNext(queue.slice(0, 2), [])).toBe("Up next: Song A – Artist · Song B – Artist");
  });

  test("returns nothing when the queue has no upcoming songs", () => {
    expect(formatUpNext([], [{ uri: "spotify:track:aaa", requester: "Nia" }])).toBe("");
    expect(buildOverlayText("Requested by Nia: Keep - Me", null, [])).toBe("Requested by Nia: Keep - Me");
    expect(buildOverlayText("Requested by Nia: Keep - Me", [], [])).toBe("Requested by Nia: Keep - Me");
  });

  test("keeps the stored now-playing line and adds one up-next line", () => {
    const now = "Requested by Nia: Right Now - Band";
    const text = buildOverlayText(now, queue.slice(0, 1), [{ uri: "spotify:track:aaa", requester: "Nia" }]);
    expect(text).toBe("Requested by Nia: Right Now - Band\nUp next: Song A – Artist (Requested by Nia)");
  });

  test("stays one line and ellipsizes long titles", () => {
    const songs: QueueSong[] = [
      { uri: "spotify:track:long", name: "Supercalifragilistic Title That Will Not Fit", artist: "An Extremely Long Artist Name" },
      { uri: "spotify:track:2", name: "Second\nSong", artist: "Band" },
    ];
    const line = formatUpNext(songs, [{ uri: "spotify:track:long", requester: "Name\nWith Break" }]);
    expect(line.startsWith("Up next: ")).toBe(true);
    expect(line.includes("\n")).toBe(false);
    expect(line.length).toBeLessThanOrEqual(UP_NEXT_LINE_MAX);
    expect(line.includes("…")).toBe(true);
    expect(line.includes("Requested by")).toBe(true);
    expect(line.includes("Second Song")).toBe(true);
  });

  test("ignores an empty requester", () => {
    expect(formatUpNext(queue.slice(0, 1), [{ uri: "spotify:track:aaa", requester: "   " }])).toBe(
      "Up next: Song A – Artist"
    );
  });
});

describe("Spotify queue payload", () => {
  test("skips the current track, episodes, and a missing player", () => {
    const payload = {
      currently_playing: { type: "track", uri: "spotify:track:now", name: "Now", artists: [{ name: "Live" }] },
      queue: [
        { type: "track", uri: "spotify:track:now", name: "Now", artists: [{ name: "Live" }] },
        { type: "episode", uri: "spotify:episode:ep", name: "Talk", show: { name: "Show" } },
        { type: "track", uri: "spotify:track:next", name: "Next", artists: [{ name: "One" }, { name: "Two" }] },
      ],
    };
    expect(tracksFromQueueResponse(200, payload)).toEqual([
      { uri: "spotify:track:next", name: "Next", artist: "One, Two" },
    ]);
    expect(tracksFromQueueResponse(204, null)).toBeNull();
    expect(tracksFromQueueResponse(404, { error: { message: "No active device found" } })).toBeNull();
    expect(tracksFromQueueResponse(429, {})).toBeNull();
    expect(tracksFromQueueResponse(500, {})).toBeNull();
    expect(tracksFromQueueResponse(200, { queue: [] })).toEqual([]);
  });
});

describe("queue cache", () => {
  beforeEach(() => resetQueueCacheForTests());

  test("calls Spotify once per window and again after an approve invalidates it", async () => {
    let calls = 0;
    const tracks: SpotifyQueueTrack[] = [{ uri: "spotify:track:a", name: "A", artist: "B" }];
    const loader = async () => {
      calls += 1;
      return tracks;
    };
    expect(await getUpcomingTracks(loader)).toEqual(tracks);
    expect(await getUpcomingTracks(loader)).toEqual(tracks);
    expect(calls).toBe(1);
    const { invalidateQueueCache } = await import("./spotify");
    invalidateQueueCache();
    expect(await getUpcomingTracks(loader)).toEqual(tracks);
    expect(calls).toBe(2);
    expect(QUEUE_CACHE_MS).toBeGreaterThanOrEqual(10_000);
    expect(QUEUE_CACHE_MS).toBeLessThanOrEqual(15_000);
  });

  test("hides the line when Spotify errors and does not stampede", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      throw new Error("spotify down");
    };
    expect(await getUpcomingTracks(loader)).toBeNull();
    expect(await getUpcomingTracks(loader)).toBeNull();
    expect(calls).toBe(1);
  });

  test("shares one in-flight read", async () => {
    let calls = 0;
    const loader = () =>
      new Promise<SpotifyQueueTrack[]>((resolve) => {
        calls += 1;
        setTimeout(() => resolve([{ uri: "spotify:track:a", name: "A", artist: "B" }]), 20);
      });
    const [a, b] = await Promise.all([getUpcomingTracks(loader), getUpcomingTracks(loader)]);
    expect(a).toEqual(b);
    expect(calls).toBe(1);
  });
});

describe("refresh intervals", () => {
  test("pending, chat, and overlay polls are easy to find and pause while hidden", () => {
    expect(PENDING_POLL_MS).toBe(30_000);
    expect(CHAT_POLL_MS).toBe(5_000);
    expect(OVERLAY_REFRESH_MS).toBe(12_000);
    expect(ADMIN_SCRIPT).toContain("var PENDING_POLL_MS = 30000");
    expect(ADMIN_SCRIPT).toContain("/api/admin/requests?status=pending");
    expect(ADMIN_SCRIPT).toContain("pendingInFlight");
    expect(ADMIN_SCRIPT).toContain("visibilitychange");
    expect(ADMIN_SCRIPT).toContain("Updated ");
    expect(ADMIN_SCRIPT).toContain("preserveScroll");
    expect(HUB_SCRIPT).toContain("var CHAT_POLL_MS = 5000");
    expect(HUB_SCRIPT).toContain("/api/chat/recent");
    expect(HUB_SCRIPT).toContain("chatPollInFlight");
    expect(HUB_SCRIPT).toContain("req.status !== 'approved'");
    expect(ADMIN_SCRIPT).toContain("var CHAT_POLL_MS = 5000");
    expect(OVERLAY_SCRIPT).toContain("var OVERLAY_REFRESH_MS = 12000");
    expect(OVERLAY_SCRIPT).toContain("/api/overlay/current");
    expect(OVERLAY_SCRIPT).not.toContain("session=");
  });
});
