// Social Stream Ninja is consumed as a network service (GPL-3.0).
// This module does not vendor SSN source. It parses server env and turns
// untrusted chat payloads into plain-text lines safe to render with esc().

export const DEFAULT_SSN_ORIGIN = "wss://io.socialstream.ninja";

export const DEFAULT_PLATFORMS = ["twitch", "youtube", "rumble", "x", "twitter"] as const;

const SESSION_RE = /^[A-Za-z0-9_-]{4,128}$/;
const PLATFORM_RE = /^[a-z0-9_-]{1,32}$/;

export type SsnConfig = {
  enabled: boolean;
  sessionId: string;
  password: string;
  serverOrigin: string;
  platforms: string[] | "*";
  hideBots: boolean;
  state: "unconfigured" | "invalid-config" | "configured";
};

export type ChatLine = {
  id: string;
  platform: string;
  author: string;
  message: string;
  donation: string;
  event: string;
  avatar: string;
  at: number;
};

export function readSsnConfig(env: Record<string, string | undefined>): SsnConfig {
  const sessionId = (env.SSN_SESSION_ID ?? "").trim();
  const password = (env.SSN_PASSWORD ?? "").trim();
  const serverOrigin = parseServerOrigin(env.SSN_SERVER_URL);
  const platforms = parsePlatforms(env.SSN_PLATFORMS);
  const hideBots = /^(1|true|yes|on)$/i.test((env.SSN_HIDE_BOTS ?? "").trim());

  if (!sessionId) {
    return {
      enabled: false,
      sessionId: "",
      password: "",
      serverOrigin,
      platforms,
      hideBots,
      state: "unconfigured",
    };
  }
  if (!SESSION_RE.test(sessionId)) {
    return {
      enabled: false,
      sessionId: "",
      password: "",
      serverOrigin,
      platforms,
      hideBots,
      state: "invalid-config",
    };
  }
  return {
    enabled: true,
    sessionId,
    password,
    serverOrigin,
    platforms,
    hideBots,
    state: "configured",
  };
}

export function parseServerOrigin(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return DEFAULT_SSN_ORIGIN;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return DEFAULT_SSN_ORIGIN;
  }
  if (url.protocol !== "wss:" && url.protocol !== "ws:") return DEFAULT_SSN_ORIGIN;
  if (!url.hostname) return DEFAULT_SSN_ORIGIN;
  // Origin only. A join path or userinfo would put the session or a password in the URL.
  return `${url.protocol}//${url.host}`;
}

export function parsePlatforms(raw: string | undefined): string[] | "*" {
  const value = (raw ?? "").trim();
  if (!value) return [...DEFAULT_PLATFORMS];
  if (value === "*") return "*";
  const list = value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => PLATFORM_RE.test(part));
  return list.length > 0 ? [...new Set(list)] : [...DEFAULT_PLATFORMS];
}

export function buildJoinMessage(config: SsnConfig): { url: string; payload: string } | null {
  if (!config.enabled) return null;
  const join: { join: string; in: number; password?: string } = {
    join: config.sessionId,
    in: 4,
  };
  if (config.password) join.password = config.password;
  return {
    url: config.serverOrigin,
    payload: JSON.stringify(join),
  };
}

const SKIP_EVENTS = new Set([
  "viewer_update",
  "hypemode",
  "viewerupdate",
  "metadata",
]);

export function normalizeIncoming(raw: unknown, config: Pick<SsnConfig, "platforms" | "hideBots">): ChatLine | null {
  const data = unwrapPayload(raw);
  if (!data) return null;
  if (data.private === true) return null;
  if (config.hideBots && data.bot === true) return null;

  const event = cleanPlain(data.event, 40).toLowerCase();
  if (event && SKIP_EVENTS.has(event)) return null;

  const platform = cleanPlatform(data.type);
  if (!platform) return null;
  if (config.platforms !== "*" && !config.platforms.includes(platform)) return null;

  const textonly = data.textonly === true;
  const message = textonly ? cleanPlain(data.chatmessage, 500) : cleanHtml(data.chatmessage, 500);
  const author = cleanHtml(data.chatname, 80);
  const donation = textonly ? cleanPlain(data.hasDonation, 60) : cleanHtml(data.hasDonation, 60);
  if (!message && !donation && !event) return null;

  const avatar = httpsUrl(data.chatimg);
  const at = typeof data.timestamp === "number" && Number.isFinite(data.timestamp) ? data.timestamp : Date.now();

  return {
    id: cleanId(data.id) ?? crypto.randomUUID(),
    platform,
    author: author || "Someone",
    message,
    donation,
    event,
    avatar,
    at,
  };
}

function unwrapPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (obj.overlayNinja && typeof obj.overlayNinja === "object" && !Array.isArray(obj.overlayNinja)) {
    return obj.overlayNinja as Record<string, unknown>;
  }
  if (typeof obj.action === "string" && !("chatname" in obj) && !("chatmessage" in obj)) return null;
  return obj;
}

function cleanPlatform(value: unknown): string {
  if (typeof value !== "string") return "";
  const platform = value.trim().toLowerCase();
  return PLATFORM_RE.test(platform) ? platform : "";
}

function cleanId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value)).slice(0, 80);
  }
  if (typeof value !== "string") return null;
  const id = value.trim();
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(id) ? id : null;
}

function cleanPlain(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const sliced = value.slice(0, 20000);
  const flat = sliced.replace(/[\u0000-\u0008\u000B-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
  return flat.slice(0, max);
}

function cleanHtml(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const sliced = value.slice(0, 20000);
  const withBreaks = sliced
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/gi, " $1 ");
  const noTags = withBreaks.replace(/<[^>]*>/g, " ");
  const decoded = noTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
  return cleanPlain(decoded, max);
}

function httpsUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (candidate.length === 0 || candidate.length > 500) return "";
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }
  if (url.protocol !== "https:") return "";
  if (url.username || url.password) return "";
  return url.toString();
}

export type ChatHub = {
  push(line: ChatLine): boolean;
  recent(limit?: number): ChatLine[];
  subscribe(send: (event: string, data: unknown) => void): () => void;
  issueTicket(): { ticket: string; expiresIn: number };
  validTicket(ticket: string): boolean;
  reset(): void;
};

const TICKET_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_TICKETS = 500;
const MAX_LINES = 100;

export function createChatHub(): ChatHub {
  const lines: ChatLine[] = [];
  const seen = new Set<string>();
  const listeners = new Set<(event: string, data: unknown) => void>();
  const tickets = new Map<string, number>();

  function pruneTickets(now: number) {
    for (const [ticket, expires] of tickets) {
      if (expires <= now) tickets.delete(ticket);
    }
  }

  return {
    push(line) {
      if (seen.has(line.id)) return false;
      seen.add(line.id);
      lines.push(line);
      while (lines.length > MAX_LINES) {
        const dropped = lines.shift();
        if (dropped) seen.delete(dropped.id);
      }
      for (const send of listeners) {
        try {
          send("chat", line);
        } catch {
          // A closed stream must not stop the others.
        }
      }
      return true;
    },
    recent(limit = 50) {
      const count = Math.max(0, Math.min(limit, MAX_LINES));
      return lines.slice(-count);
    },
    subscribe(send) {
      listeners.add(send);
      return () => listeners.delete(send);
    },
    issueTicket() {
      const now = Date.now();
      pruneTickets(now);
      while (tickets.size >= MAX_TICKETS) {
        const oldest = tickets.keys().next().value;
        if (oldest === undefined) break;
        tickets.delete(oldest);
      }
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const ticket = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
      tickets.set(ticket, now + TICKET_TTL_MS);
      return { ticket, expiresIn: Math.floor(TICKET_TTL_MS / 1000) };
    },
    validTicket(ticket) {
      if (!/^[a-f0-9]{64}$/.test(ticket)) return false;
      const expires = tickets.get(ticket);
      if (!expires) return false;
      if (expires <= Date.now()) {
        tickets.delete(ticket);
        return false;
      }
      return true;
    },
    reset() {
      lines.length = 0;
      seen.clear();
      listeners.clear();
      tickets.clear();
    },
  };
}

export const chatHub = createChatHub();
