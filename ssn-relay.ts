import { buildJoinMessage, chatHub, normalizeIncoming, readSsnConfig, type ChatLine, type SsnConfig } from "./ssn";

export type RelayState = "unconfigured" | "invalid-config" | "connecting" | "live" | "disconnected";

export type RelayStatus = {
  mode: "server-relay";
  configured: boolean;
  connected: boolean;
  state: RelayState;
  platforms: string[] | "*";
  hideBots: boolean;
};

type SocketLike = {
  send(data: string): void;
  close(): void;
  addEventListener(type: "open" | "message" | "error" | "close", listener: (ev: { data?: unknown }) => void): void;
};

type SocketFactory = (url: string) => SocketLike;

type Relay = {
  start(): void;
  stop(): void;
  status(): RelayStatus;
};

const GLOBAL_KEY = "__theJamSsnRelay";

function messageText(data: unknown): string {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data);
  return "";
}

function publicStatus(config: SsnConfig, state: RelayState): RelayStatus {
  return {
    mode: "server-relay",
    configured: config.enabled,
    connected: state === "live",
    state: config.enabled ? state : config.state === "invalid-config" ? "invalid-config" : "unconfigured",
    platforms: config.platforms,
    hideBots: config.hideBots,
  };
}

export function createSsnRelay(options: {
  config: SsnConfig;
  createSocket: SocketFactory;
  onLine?: (line: ChatLine) => void;
  schedule?: (fn: () => void, delayMs: number) => { cancel(): void };
}): Relay {
  let state: RelayState = options.config.enabled ? "disconnected" : options.config.state === "invalid-config" ? "invalid-config" : "unconfigured";
  let socket: SocketLike | null = null;
  let stopped = false;
  let attempt = 0;
  let timer: { cancel(): void } | null = null;

  const schedule = options.schedule ?? ((fn, delayMs) => {
    const id = setTimeout(fn, delayMs);
    return { cancel: () => clearTimeout(id) };
  });

  function connect() {
    if (stopped || !options.config.enabled) return;
    const join = buildJoinMessage(options.config);
    if (!join) return;
    state = "connecting";
    let opened = false;
    try {
      socket = options.createSocket(join.url);
    } catch (error) {
      console.error("SSN relay could not open a socket:", error instanceof Error ? error.message : "unknown error");
      state = "disconnected";
      scheduleReconnect();
      return;
    }
    const current = socket;
    current.addEventListener("open", () => {
      if (socket !== current) return;
      opened = true;
      attempt = 0;
      state = "live";
      try {
        current.send(join.payload);
      } catch (error) {
        console.error("SSN relay failed to join:", error instanceof Error ? error.message : "unknown error");
      }
    });
    current.addEventListener("message", (ev) => {
      if (socket !== current) return;
      const text = messageText(ev.data);
      if (!text || text.length > 100_000) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return;
      }
      const line = normalizeIncoming(parsed, options.config);
      if (!line) return;
      if (options.onLine) options.onLine(line);
      else chatHub.push(line);
    });
    const fail = () => {
      if (stopped || socket !== current) return;
      socket = null;
      state = "disconnected";
      if (opened) attempt = 0;
      scheduleReconnect();
    };
    current.addEventListener("error", fail);
    current.addEventListener("close", fail);
  }

  function scheduleReconnect() {
    if (stopped || !options.config.enabled) return;
    attempt += 1;
    const delay = Math.min(30_000, 500 * 2 ** Math.min(attempt, 6));
    timer?.cancel();
    timer = schedule(() => {
      timer = null;
      connect();
    }, delay);
  }

  return {
    start() {
      if (!options.config.enabled) {
        if (options.config.state === "invalid-config") {
          console.error("SSN_SESSION_ID is set but not a 4-128 character session id. Live chat stays off.");
        } else {
          console.info("SSN_SESSION_ID is unset. The site will run without live chat.");
        }
        return;
      }
      console.info("SSN relay starting (session id stays on the server).");
      connect();
    },
    stop() {
      stopped = true;
      timer?.cancel();
      timer = null;
      try {
        socket?.close();
      } catch {
        // Already closed.
      }
      socket = null;
    },
    status() {
      return publicStatus(options.config, state);
    },
  };
}

export function startSsnRelay(env: Record<string, string | undefined> = process.env): Relay {
  const previous = (globalThis as Record<string, Relay | undefined>)[GLOBAL_KEY];
  previous?.stop();
  const config = readSsnConfig(env);
  const relay = createSsnRelay({
    config,
    createSocket: (url) => new WebSocket(url) as unknown as SocketLike,
  });
  (globalThis as Record<string, Relay>)[GLOBAL_KEY] = relay;
  relay.start();
  return relay;
}

export function getSsnRelay(): Relay | null {
  return (globalThis as Record<string, Relay | undefined>)[GLOBAL_KEY] ?? null;
}
