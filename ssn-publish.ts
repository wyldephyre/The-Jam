// Forwards an approved Jam message into Social Stream Ninja as incoming chat.
// The extension listens on channel 1 when "Enable remote API control" is on
// (background.js joins wss://io.socialstream.ninja/api with in: 1). It handles
// action "extContent" by JSON.parse(value), applyBotActions, then
// sendToDestinations, which is the same path as captured chat into the dock.
// sendChat / sendEncodedChat are not used: those post into the real platform chats.
// The session id stays in the join payload, never in the socket URL.

import { readSsnConfig, type SsnConfig } from "./ssn";

export const SSN_CONTROL_CHANNEL = 1;
export const DEFAULT_JAM_VIEWER = "Jam viewer";
export const SSN_SOURCE_NAME = "The Jam";
const MAX_NAME = 80;
const MAX_MESSAGE = 500;
const PUBLISH_TIMEOUT_MS = 4000;

export type JamExtContent = {
  chatname: string;
  chatmessage: string;
  type: "external";
  textonly: true;
  source: typeof SSN_SOURCE_NAME;
};

export type ExtContentFrames = {
  url: string;
  join: string;
  action: string;
};

type SocketLike = {
  send(data: string): void;
  close(): void;
  addEventListener(type: "open" | "error" | "close", listener: () => void): void;
};

type SocketFactory = (url: string) => SocketLike;

export type ApprovedMessage = {
  type: string;
  status?: string;
  content: unknown;
  viewer?: { username?: string | null } | null;
};

function defaultCreateSocket(url: string): SocketLike {
  return new WebSocket(url) as unknown as SocketLike;
}

export function sanitizeJamName(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_JAM_VIEWER;
  const name = value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  return name || DEFAULT_JAM_VIEWER;
}

export function sanitizeJamMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const message = value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, MAX_MESSAGE);
  return message.length > 0 ? message : null;
}

export function buildJamExtContent(name: unknown, message: unknown): JamExtContent | null {
  const chatmessage = sanitizeJamMessage(message);
  if (!chatmessage) return null;
  return {
    chatname: sanitizeJamName(name),
    chatmessage,
    type: "external",
    textonly: true,
    source: SSN_SOURCE_NAME,
  };
}

export function buildExtContentFrames(config: SsnConfig, name: unknown, message: unknown): ExtContentFrames | null {
  if (!config.enabled) return null;
  const body = buildJamExtContent(name, message);
  if (!body) return null;
  const join: { join: string; out: number; password?: string } = {
    join: config.sessionId,
    out: SSN_CONTROL_CHANNEL,
  };
  if (config.password) join.password = config.password;
  return {
    url: config.serverOrigin,
    join: JSON.stringify(join),
    action: JSON.stringify({
      action: "extContent",
      value: JSON.stringify(body),
    }),
  };
}

function redact(message: string, secrets: string[]): string {
  let out = message;
  for (const secret of secrets) {
    if (secret.length < 4) continue;
    out = out.split(secret).join("[redacted]");
  }
  return out.replace(/\s+/g, " ").trim().slice(0, 300);
}

export async function publishExtContent(options: {
  config: SsnConfig;
  name: unknown;
  message: unknown;
  createSocket?: SocketFactory;
  timeoutMs?: number;
}): Promise<"sent" | "skipped" | "failed"> {
  const frames = buildExtContentFrames(options.config, options.name, options.message);
  if (!frames) return "skipped";
  const createSocket = options.createSocket ?? defaultCreateSocket;
  const timeoutMs = options.timeoutMs ?? PUBLISH_TIMEOUT_MS;
  const secrets = [options.config.sessionId, options.config.password];
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let sent = false;
      let socket: SocketLike | null = null;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          socket?.close();
        } catch {
          // Already closed.
        }
        if (error) reject(error);
        else resolve();
      };
      const timer = setTimeout(() => finish(new Error("timeout")), timeoutMs);
      try {
        socket = createSocket(frames.url);
      } catch (error) {
        finish(error instanceof Error ? error : new Error("socket"));
        return;
      }
      socket.addEventListener("open", () => {
        if (settled) return;
        try {
          // Join first so this socket publishes on channel 1, then the action.
          socket?.send(frames.join);
          socket?.send(frames.action);
          sent = true;
          finish();
        } catch (error) {
          finish(error instanceof Error ? error : new Error("send"));
        }
      });
      socket.addEventListener("error", () => finish(new Error("socket error")));
      socket.addEventListener("close", () => finish(sent ? undefined : new Error("closed")));
    });
    return "sent";
  } catch (error) {
    const detail = redact(error instanceof Error ? error.message : "unknown error", secrets);
    console.error(`SSN message forward failed: ${detail || "unknown error"}`);
    return "failed";
  }
}

export function forwardApprovedMessage(
  request: ApprovedMessage,
  options: {
    env?: Record<string, string | undefined>;
    createSocket?: SocketFactory;
    timeoutMs?: number;
  } = {}
): void {
  if (request.type !== "message") return;
  if (request.status === "approved") return;
  const config = readSsnConfig(options.env ?? process.env);
  void publishExtContent({
    config,
    name: request.viewer?.username,
    message: request.content,
    createSocket: options.createSocket,
    timeoutMs: options.timeoutMs,
  }).catch((error) => {
    const detail = redact(error instanceof Error ? error.message : "unknown error", [config.sessionId, config.password]);
    console.error(`SSN message forward failed: ${detail || "unknown error"}`);
  });
}
