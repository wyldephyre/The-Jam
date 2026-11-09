import { describe, expect, test } from "bun:test";
import { HUB_BODY, HUB_SCRIPT, ADMIN_BODY, ADMIN_SCRIPT, htmlPage } from "./pages";
import {
  buildJoinMessage,
  createChatHub,
  normalizeIncoming,
  parseServerOrigin,
  readSsnConfig,
  type ChatLine,
} from "./ssn";
import { createSsnRelay } from "./ssn-relay";

const baseEnv = {
  SSN_SESSION_ID: "CapSession1",
  SSN_PASSWORD: "stream-secret",
  SSN_SERVER_URL: "wss://io.socialstream.ninja/join/CapSession1/4?password=stream-secret",
  SSN_PLATFORMS: "twitch,youtube,rumble,x,twitter",
};

describe("SSN config", () => {
  test("keeps the session and password out of the socket URL", () => {
    const config = readSsnConfig(baseEnv);
    const join = buildJoinMessage(config);
    expect(config.enabled).toBe(true);
    expect(join?.url).toBe("wss://io.socialstream.ninja");
    expect(join?.url).not.toContain("CapSession1");
    expect(join?.url).not.toContain("stream-secret");
    const payload = JSON.parse(join!.payload);
    expect(payload).toEqual({ join: "CapSession1", in: 4, password: "stream-secret" });
  });

  test("omits the password field when unset", () => {
    const config = readSsnConfig({ SSN_SESSION_ID: "CapSession1" });
    const payload = JSON.parse(buildJoinMessage(config)!.payload);
    expect(payload.password).toBeUndefined();
    expect(payload.in).toBe(4);
  });

  test("refuses a missing or malformed session without throwing", () => {
    expect(readSsnConfig({}).enabled).toBe(false);
    expect(readSsnConfig({}).state).toBe("unconfigured");
    expect(readSsnConfig({ SSN_SESSION_ID: "../etc" }).state).toBe("invalid-config");
    expect(readSsnConfig({ SSN_SESSION_ID: "ab" }).enabled).toBe(false);
  });

  test("drops userinfo and non-websocket server URLs", () => {
    expect(parseServerOrigin("ws://user:pw@127.0.0.1:3003/extension")).toBe("ws://127.0.0.1:3003");
    expect(parseServerOrigin("https://evil.example")).toBe("wss://io.socialstream.ninja");
    expect(parseServerOrigin("")).toBe("wss://io.socialstream.ninja");
  });
});

describe("chat normalization", () => {
  const config = readSsnConfig(baseEnv);

  test("strips HTML from chat and keeps plain text", () => {
    const line = normalizeIncoming(
      {
        id: 42,
        type: "twitch",
        chatname: "<b>Cap</b>",
        chatmessage: 'Hello <img alt="KEKW" src="https://evil.example/x.png"> <script>alert(1)</script>chat',
        textonly: false,
        chatimg: "https://static-cdn.jtvnw.net/avatar.png",
      },
      config
    );
    expect(line?.author).toBe("Cap");
    expect(line?.message).toContain("Hello");
    expect(line?.message).toContain("KEKW");
    expect(line?.message).not.toContain("<");
    expect(line?.message).not.toContain("alert");
    expect(line?.avatar).toBe("https://static-cdn.jtvnw.net/avatar.png");
    expect(line?.platform).toBe("twitch");
  });

  test("keeps literal text when SSN marks the message text-only", () => {
    const line = normalizeIncoming(
      { id: "m1", type: "youtube", chatname: "Fan", chatmessage: "<3", textonly: true },
      config
    );
    expect(line?.message).toBe("<3");
  });

  test("accepts Rumble and X, and drops other platforms by default", () => {
    expect(normalizeIncoming({ id: "r", type: "rumble", chatname: "A", chatmessage: "rant" }, config)?.platform).toBe("rumble");
    expect(normalizeIncoming({ id: "x", type: "x", chatname: "A", chatmessage: "yo" }, config)?.platform).toBe("x");
    expect(normalizeIncoming({ id: "t", type: "twitter", chatname: "A", chatmessage: "yo" }, config)?.platform).toBe("twitter");
    expect(normalizeIncoming({ id: "k", type: "kick", chatname: "A", chatmessage: "yo" }, config)).toBeNull();
  });

  test("drops private messages, bots when asked, viewer counts, and unsafe avatars", () => {
    expect(normalizeIncoming({ id: "p", type: "twitch", chatname: "A", chatmessage: "dm", private: true }, config)).toBeNull();
    const hiding = readSsnConfig({ ...baseEnv, SSN_HIDE_BOTS: "1" });
    expect(normalizeIncoming({ id: "b", type: "twitch", chatname: "Nightbot", chatmessage: "hi", bot: true }, hiding)).toBeNull();
    expect(normalizeIncoming({ type: "twitch", event: "viewer_update", chatname: "", chatmessage: "" }, config)).toBeNull();
    const line = normalizeIncoming(
      {
        id: "img",
        type: "youtube",
        chatname: "A",
        chatmessage: "hi",
        chatimg: "javascript:alert(1)",
      },
      config
    );
    expect(line?.avatar).toBe("");
    const dataUri = normalizeIncoming(
      { id: "data", type: "youtube", chatname: "A", chatmessage: "hi", chatimg: "data:image/png;base64,aaaa" },
      config
    );
    expect(dataUri?.avatar).toBe("");
  });

  test("unwraps overlayNinja and ignores command frames", () => {
    const line = normalizeIncoming(
      { overlayNinja: { id: "wrap", type: "rumble", chatname: "Viewer", chatmessage: "lets go" } },
      config
    );
    expect(line?.message).toBe("lets go");
    expect(normalizeIncoming({ action: "nextInQueue" }, config)).toBeNull();
  });
});

describe("chat hub", () => {
  test("dedupes, caps history, and issues a ticket that is not the password", () => {
    const hub = createChatHub();
    const line: ChatLine = {
      id: "1",
      platform: "twitch",
      author: "A",
      message: "hi",
      donation: "",
      event: "",
      avatar: "",
      at: 1,
    };
    expect(hub.push(line)).toBe(true);
    expect(hub.push(line)).toBe(false);
    expect(hub.recent()).toHaveLength(1);
    const { ticket } = hub.issueTicket();
    expect(ticket).toMatch(/^[a-f0-9]{64}$/);
    expect(ticket).not.toContain("stream-secret");
    expect(hub.validTicket(ticket)).toBe(true);
    expect(hub.validTicket("nope")).toBe(false);
  });
});

describe("relay", () => {
  test("joins channel 4 and publishes a sanitized line", () => {
    const config = readSsnConfig(baseEnv);
    const lines: ChatLine[] = [];
    let socket: FakeSocket | null = null;
    const relay = createSsnRelay({
      config,
      onLine: (line) => lines.push(line),
      createSocket: () => {
        socket = new FakeSocket();
        return socket;
      },
      schedule: () => ({ cancel() {} }),
    });
    relay.start();
    expect(relay.status().state).toBe("connecting");
    socket!.emit("open");
    expect(relay.status().connected).toBe(true);
    expect(socket!.sent[0]).toContain('"in":4');
    expect(socket!.sent[0]).not.toContain("wss://");
    socket!.emit("message", {
      data: JSON.stringify({
        id: "live-1",
        type: "youtube",
        chatname: "Viewer",
        chatmessage: "<b>hello</b>",
        textonly: false,
      }),
    });
    expect(lines[0]?.message).toBe("hello");
    expect(lines[0]?.platform).toBe("youtube");
    const status = JSON.stringify(relay.status());
    expect(status).not.toContain("CapSession1");
    expect(status).not.toContain("stream-secret");
    relay.stop();
  });
});

describe("pages", () => {
  test("chat UI does not embed a session, password, or SSN socket", () => {
    const html = htmlPage("hub", HUB_BODY, HUB_SCRIPT) + htmlPage("admin", ADMIN_BODY, ADMIN_SCRIPT);
    expect(HUB_BODY).toContain('data-tab="chat"');
    expect(ADMIN_BODY).toContain('data-tab="chat"');
    expect(html).not.toContain("socialstream.ninja");
    expect(html).not.toContain("SSN_SESSION");
    expect(html).not.toContain("SSN_PASSWORD");
    expect(html).not.toContain("session=");
  });
});

class FakeSocket {
  sent: string[] = [];
  private listeners: Record<string, Array<(ev: { data?: unknown }) => void>> = {};
  send(data: string) {
    this.sent.push(data);
  }
  close() {}
  addEventListener(type: "open" | "message" | "error" | "close", listener: (ev: { data?: unknown }) => void) {
    (this.listeners[type] ??= []).push(listener);
  }
  emit(type: "open" | "message" | "error" | "close", ev: { data?: unknown } = {}) {
    for (const listener of this.listeners[type] ?? []) listener(ev);
  }
}
