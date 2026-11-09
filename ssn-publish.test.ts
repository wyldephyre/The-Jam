import { describe, expect, test } from "bun:test";
import { readSsnConfig } from "./ssn";
import {
  buildExtContentFrames,
  buildJamExtContent,
  forwardApprovedMessage,
  publishExtContent,
  sanitizeJamMessage,
  sanitizeJamName,
} from "./ssn-publish";

const env = {
  SSN_SESSION_ID: "CapSession1",
  SSN_PASSWORD: "stream-secret",
  SSN_SERVER_URL: "wss://io.socialstream.ninja/join/CapSession1/1?password=stream-secret",
};

class FakeSocket {
  sent: string[] = [];
  closed = false;
  private listeners: Record<string, Array<() => void>> = {};
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.emit("close");
  }
  addEventListener(type: "open" | "error" | "close", listener: () => void) {
    (this.listeners[type] ??= []).push(listener);
  }
  emit(type: "open" | "error" | "close") {
    for (const listener of [...(this.listeners[type] ?? [])]) listener();
  }
}

function captureErrors(run: () => Promise<void> | void): Promise<string[]> {
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args.map((part) => String(part)).join(" "));
  };
  return Promise.resolve()
    .then(run)
    .finally(() => {
      console.error = original;
    })
    .then(() => lines);
}

describe("Jam message payload", () => {
  test("builds an extContent frame on channel 1 without the session in the URL", () => {
    const config = readSsnConfig(env);
    const frames = buildExtContentFrames(config, "Cap Fan", "play the jam");
    expect(frames?.url).toBe("wss://io.socialstream.ninja");
    expect(frames?.url).not.toContain("CapSession1");
    expect(frames?.url).not.toContain("stream-secret");
    const join = JSON.parse(frames!.join);
    expect(join).toEqual({ join: "CapSession1", out: 1, password: "stream-secret" });
    const action = JSON.parse(frames!.action);
    expect(action.action).toBe("extContent");
    expect(action.action).not.toBe("sendChat");
    expect(action.action).not.toBe("sendEncodedChat");
    expect(typeof action.value).toBe("string");
    expect(JSON.parse(action.value)).toEqual({
      chatname: "Cap Fan",
      chatmessage: "play the jam",
      type: "external",
      textonly: true,
      source: "The Jam",
    });
  });

  test("omits the password when it is unset", () => {
    const frames = buildExtContentFrames(readSsnConfig({ SSN_SESSION_ID: "CapSession1" }), "A", "hi");
    expect(JSON.parse(frames!.join).password).toBeUndefined();
  });

  test("uses Jam viewer and drops empty, unsafe, or oversized text", () => {
    expect(sanitizeJamName(null)).toBe("Jam viewer");
    expect(sanitizeJamName("  \n  ")).toBe("Jam viewer");
    expect(sanitizeJamName("A\u0000B\nC")).toBe("A B C");
    expect(sanitizeJamName("n".repeat(100))).toHaveLength(80);
    expect(sanitizeJamMessage("  ")).toBeNull();
    expect(sanitizeJamMessage("hello\n<3\u0000")).toBe("hello\n<3");
    expect(sanitizeJamMessage("m".repeat(800))).toHaveLength(500);
    expect(buildJamExtContent("", "")).toBeNull();
    expect(buildExtContentFrames(readSsnConfig({}), "A", "hi")).toBeNull();
    expect(buildExtContentFrames(readSsnConfig({ SSN_SESSION_ID: "../etc" }), "A", "hi")).toBeNull();
  });
});

describe("publish", () => {
  test("joins channel 1 and sends extContent", async () => {
    const socket = new FakeSocket();
    let url = "";
    const result = publishExtContent({
      config: readSsnConfig(env),
      name: "  ",
      message: "hello from the hub",
      createSocket: (next) => {
        url = next;
        return socket;
      },
    });
    expect(url).toBe("wss://io.socialstream.ninja");
    socket.emit("open");
    expect(await result).toBe("sent");
    const action = JSON.parse(socket.sent[1]);
    expect(JSON.parse(action.value).chatname).toBe("Jam viewer");
    expect(JSON.parse(action.value).chatmessage).toBe("hello from the hub");
    expect(socket.sent.join("\n")).not.toContain("sendChat");
    expect(socket.closed).toBe(true);
  });

  test("does not open a socket when SSN is off or the text is empty", async () => {
    let opened = 0;
    const createSocket = () => {
      opened += 1;
      return new FakeSocket();
    };
    expect(
      await publishExtContent({
        config: readSsnConfig({}),
        name: "A",
        message: "hi",
        createSocket,
      })
    ).toBe("skipped");
    expect(
      await publishExtContent({
        config: readSsnConfig(env),
        name: "A",
        message: "   ",
        createSocket,
      })
    ).toBe("skipped");
    expect(opened).toBe(0);
  });

  test("logs a failure without the session id or password and does not throw", async () => {
    const lines = await captureErrors(async () => {
      const result = await publishExtContent({
        config: readSsnConfig(env),
        name: "A",
        message: "hi",
        createSocket: () => {
          throw new Error("connect failed for CapSession1 using stream-secret");
        },
      });
      expect(result).toBe("failed");
    });
    expect(lines.join("\n")).toContain("SSN message forward failed");
    expect(lines.join("\n")).not.toContain("CapSession1");
    expect(lines.join("\n")).not.toContain("stream-secret");
    expect(lines.join("\n")).toContain("[redacted]");
  });

  test("a socket that never opens fails closed", async () => {
    const lines = await captureErrors(async () => {
      const result = await publishExtContent({
        config: readSsnConfig(env),
        name: "A",
        message: "hi",
        timeoutMs: 20,
        createSocket: () => new FakeSocket(),
      });
      expect(result).toBe("failed");
    });
    expect(lines.join("\n")).toContain("timeout");
    expect(lines.join("\n")).not.toContain("CapSession1");
    expect(lines.join("\n")).not.toContain("stream-secret");
  });

  test("a socket that closes before open fails closed", async () => {
    const socket = new FakeSocket();
    const pending = publishExtContent({
      config: readSsnConfig(env),
      name: "A",
      message: "hi",
      createSocket: () => socket,
    });
    socket.emit("close");
    expect(await pending).toBe("failed");
  });
});

describe("approval gate", () => {
  test("forwards a pending message and ignores songs and repeats", async () => {
    const sockets: FakeSocket[] = [];
    forwardApprovedMessage(
      { type: "message", status: "pending", content: "say hi", viewer: { username: "Nia" } },
      {
        env,
        createSocket: () => {
          const socket = new FakeSocket();
          sockets.push(socket);
          return socket;
        },
      }
    );
    forwardApprovedMessage(
      { type: "song", status: "pending", content: "Track", viewer: { username: "Nia" } },
      { env, createSocket: () => { throw new Error("song"); } }
    );
    forwardApprovedMessage(
      { type: "message", status: "approved", content: "again", viewer: { username: "Nia" } },
      { env, createSocket: () => { throw new Error("repeat"); } }
    );
    expect(sockets).toHaveLength(1);
    sockets[0]!.emit("open");
    const body = JSON.parse(JSON.parse(sockets[0]!.sent[1]!).value);
    expect(body.chatname).toBe("Nia");
    expect(body.chatmessage).toBe("say hi");
    expect(body.type).toBe("external");
    await Promise.resolve();
  });
});
