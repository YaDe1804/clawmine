import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setActivePluginRegistry } from "../../plugins/runtime.js";
import {
  createChannelTestPluginBase,
  createTestRegistry,
} from "../../test-utils/channel-plugins.js";
import { resolveLastChannelRaw, resolveLastToRaw } from "./session-delivery.js";

const emptyRegistry = createTestRegistry([]);
const antarbridgeRegistry = createTestRegistry([
  {
    pluginId: "antarbridge",
    plugin: createChannelTestPluginBase({ id: "antarbridge" }),
    source: "test",
  },
]);

describe("inter-session lastRoute preservation (fixes #54441)", () => {
  beforeEach(() => {
    setActivePluginRegistry(antarbridgeRegistry);
  });

  afterEach(() => {
    setActivePluginRegistry(emptyRegistry);
  });

  it("inter-session message does NOT overwrite established AntarBridge lastChannel", () => {
    expect(
      resolveLastChannelRaw({
        originatingChannelRaw: "webchat",
        persistedLastChannel: "antarbridge",
        sessionKey: "agent:samantha:main",
        isInterSession: true,
      }),
    ).toBe("antarbridge");
  });

  it("inter-session message does NOT overwrite established AntarBridge lastChannel from session key", () => {
    expect(
      resolveLastChannelRaw({
        originatingChannelRaw: "webchat",
        persistedLastChannel: "antarbridge",
        sessionKey: "agent:main:antarbridge:direct:123456",
        isInterSession: true,
      }),
    ).toBe("antarbridge");
  });

  it("inter-session message does NOT overwrite established external lastTo", () => {
    expect(
      resolveLastToRaw({
        originatingChannelRaw: "webchat",
        originatingToRaw: "session:somekey",
        toRaw: "session:somekey",
        persistedLastTo: "channel:1234567890",
        persistedLastChannel: "antarbridge",
        sessionKey: "agent:samantha:main",
        isInterSession: true,
      }),
    ).toBe("channel:1234567890");
  });

  it("regular AntarBridge user message DOES update lastChannel normally", () => {
    expect(
      resolveLastChannelRaw({
        originatingChannelRaw: "antarbridge",
        persistedLastChannel: "antarbridge",
        sessionKey: "agent:main:antarbridge:channel:123",
        isInterSession: false,
      }),
    ).toBe("antarbridge");
  });

  it("inter-session on a NEW session (no persisted external route) may set webchat", () => {
    // When there is no established external route, inter-session should not
    // forcefully block the update — the session has no external route to protect.
    const result = resolveLastChannelRaw({
      originatingChannelRaw: "webchat",
      persistedLastChannel: undefined,
      sessionKey: "agent:samantha:main",
      isInterSession: true,
    });
    // No external route existed — falls through to normal resolution (webchat or undefined)
    // The important thing is it does NOT throw and returns a defined or undefined value.
    expect(result === "webchat" || result === undefined).toBe(true);
  });

  it("inter-session on session with no persisted lastTo does not crash", () => {
    const result = resolveLastToRaw({
      originatingChannelRaw: "webchat",
      originatingToRaw: "session:somekey",
      toRaw: "session:somekey",
      persistedLastTo: undefined,
      persistedLastChannel: undefined,
      sessionKey: "agent:samantha:main",
      isInterSession: true,
    });
    // No external route — falls through to normal resolution
    expect(result === "session:somekey" || result === undefined).toBe(true);
  });
});

describe("session delivery direct-session routing overrides", () => {
  beforeEach(() => {
    setActivePluginRegistry(antarbridgeRegistry);
  });

  afterEach(() => {
    setActivePluginRegistry(emptyRegistry);
  });

  it.each([
    "agent:main:direct:user-1",
    "agent:main:antarbridge:direct:123456",
    "agent:main:antarbridge:account-a:direct:123456",
    "agent:main:antarbridge:dm:123456",
    "agent:main:antarbridge:direct:123456:thread:99",
    "agent:main:antarbridge:account-a:direct:123456:topic:ops",
  ])(
    "preserves persisted external route when webchat accesses channel-peer session %s (fixes #47745)",
    (sessionKey) => {
      // Webchat/dashboard viewing an external-channel session must not overwrite
      // the delivery route — subagents must still deliver to the original channel.
      expect(
        resolveLastChannelRaw({
          originatingChannelRaw: "webchat",
          persistedLastChannel: "antarbridge",
          sessionKey,
        }),
      ).toBe("antarbridge");
      expect(
        resolveLastToRaw({
          originatingChannelRaw: "webchat",
          originatingToRaw: "session:dashboard",
          persistedLastChannel: "antarbridge",
          persistedLastTo: "123456",
          sessionKey,
        }),
      ).toBe("123456");
    },
  );

  it.each([
    "agent:main:main:direct",
    "agent:main:cron:job-1:dm",
    "agent:main:subagent:worker:direct:user-1",
    "agent:main:antarbridge:channel:direct",
    "agent:main:antarbridge:account-a:direct",
    "agent:main:antarbridge:direct:123456:cron:job-1",
  ])("keeps persisted external routes for malformed direct-like key %s", (sessionKey) => {
    expect(
      resolveLastChannelRaw({
        originatingChannelRaw: "webchat",
        persistedLastChannel: "antarbridge",
        sessionKey,
      }),
    ).toBe("antarbridge");
    expect(
      resolveLastToRaw({
        originatingChannelRaw: "webchat",
        originatingToRaw: "session:dashboard",
        persistedLastChannel: "antarbridge",
        persistedLastTo: "group:12345",
        sessionKey,
      }),
    ).toBe("group:12345");
  });
});
