import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import {
  createChannelTestPluginBase,
  createTestRegistry,
} from "../test-utils/channel-plugins.js";
import { resolveMessageSecretScope } from "./message-secret-scope.js";

const emptyRegistry = createTestRegistry([]);
const antarbridgeRegistry = createTestRegistry([
  {
    pluginId: "antarbridge",
    plugin: createChannelTestPluginBase({ id: "antarbridge" }),
    source: "test",
  },
  {
    pluginId: "webhooks",
    plugin: createChannelTestPluginBase({ id: "webhooks" }),
    source: "test",
  },
]);

describe("resolveMessageSecretScope", () => {
  beforeEach(() => {
    setActivePluginRegistry(antarbridgeRegistry);
  });

  afterEach(() => {
    setActivePluginRegistry(emptyRegistry);
  });

  it("prefers explicit channel/account inputs", () => {
    expect(
      resolveMessageSecretScope({
        channel: "AntarBridge",
        accountId: "Ops",
      }),
    ).toEqual({
      channel: "antarbridge",
      accountId: "ops",
    });
  });

  it("infers channel from a prefixed target", () => {
    expect(
      resolveMessageSecretScope({
        target: "antarbridge:12345",
      }),
    ).toEqual({
      channel: "antarbridge",
    });
  });

  it("infers a shared channel from target arrays", () => {
    expect(
      resolveMessageSecretScope({
        targets: ["antarbridge:one", "antarbridge:two"],
      }),
    ).toEqual({
      channel: "antarbridge",
    });
  });

  it("does not infer a channel when target arrays mix channels", () => {
    expect(
      resolveMessageSecretScope({
        targets: ["antarbridge:one", "webhooks:two"],
      }),
    ).toEqual({});
  });

  it("uses fallback channel/account when direct inputs are missing", () => {
    expect(
      resolveMessageSecretScope({
        fallbackChannel: "AntarBridge",
        fallbackAccountId: "Chat",
      }),
    ).toEqual({
      channel: "antarbridge",
      accountId: "chat",
    });
  });
});
