import { expect } from "vitest";
import { getBundledChannelPlugin } from "../../../src/channels/plugins/bundled.js";
import type { ChannelPlugin } from "../../../src/channels/plugins/types.js";
import type { OpenClawConfig } from "../../../src/config/config.js";

type SetupContractEntry = {
  id: string;
  plugin: Pick<ChannelPlugin, "id" | "config" | "setup">;
  cases: Array<{
    name: string;
    cfg: OpenClawConfig;
    accountId?: string;
    input: Record<string, unknown>;
    expectedAccountId?: string;
    expectedValidation?: string | null;
    beforeTest?: () => void;
    assertPatchedConfig?: (cfg: OpenClawConfig) => void;
    assertResolvedAccount?: (account: unknown, cfg: OpenClawConfig) => void;
  }>;
};

type StatusContractEntry = {
  id: string;
  plugin: Pick<ChannelPlugin, "id" | "config" | "status">;
  cases: Array<{
    name: string;
    cfg: OpenClawConfig;
    accountId?: string;
    runtime?: Record<string, unknown>;
    probe?: unknown;
    beforeTest?: () => void;
    assertSnapshot?: (snapshot: Record<string, unknown>) => void;
    assertSummary?: (summary: Record<string, unknown>) => void;
  }>;
};

let setupContractRegistryCache: SetupContractEntry[] | undefined;
let statusContractRegistryCache: StatusContractEntry[] | undefined;

type SetupContractDef = Omit<SetupContractEntry, "plugin"> & { id: string };

function collectBundledSetupContractEntries(defs: readonly SetupContractDef[]): SetupContractEntry[] {
  const out: SetupContractEntry[] = [];
  for (const def of defs) {
    const loaded = getBundledChannelPlugin(def.id);
    if (!loaded) {
      continue;
    }
    out.push({
      id: def.id,
      cases: def.cases,
      plugin: {
        id: loaded.id,
        config: loaded.config,
        setup: loaded.setup,
      },
    });
  }
  return out;
}

type StatusContractDef = Omit<StatusContractEntry, "plugin"> & { id: string };

function collectBundledStatusContractEntries(defs: readonly StatusContractDef[]): StatusContractEntry[] {
  const out: StatusContractEntry[] = [];
  for (const def of defs) {
    const loaded = getBundledChannelPlugin(def.id);
    if (!loaded) {
      continue;
    }
    out.push({
      id: def.id,
      cases: def.cases,
      plugin: {
        id: loaded.id,
        config: loaded.config,
        status: loaded.status,
      },
    });
  }
  return out;
}

export function getSetupContractRegistry(): SetupContractEntry[] {
  setupContractRegistryCache ??= collectBundledSetupContractEntries([
    {
      id: "slack",
      cases: [
        {
          name: "default account stores tokens and enables the channel",
          cfg: {} as OpenClawConfig,
          input: {
            botToken: "xoxb-test",
            appToken: "xapp-test",
          },
          expectedAccountId: "default",
          assertPatchedConfig: (cfg) => {
            expect(cfg.channels?.slack?.enabled).toBe(true);
            expect(cfg.channels?.slack?.botToken).toBe("xoxb-test");
            expect(cfg.channels?.slack?.appToken).toBe("xapp-test");
          },
        },
        {
          name: "non-default env setup is rejected",
          cfg: {} as OpenClawConfig,
          accountId: "ops",
          input: {
            useEnv: true,
          },
          expectedAccountId: "ops",
          expectedValidation: "Slack env tokens can only be used for the default account.",
        },
      ],
    },
    {
      id: "mattermost",
      cases: [
        {
          name: "default account stores token and normalized base URL",
          cfg: {} as OpenClawConfig,
          input: {
            botToken: "test-token",
            httpUrl: "https://chat.example.com/",
          },
          expectedAccountId: "default",
          assertPatchedConfig: (cfg) => {
            expect(cfg.channels?.mattermost?.enabled).toBe(true);
            expect(cfg.channels?.mattermost?.botToken).toBe("test-token");
            expect(cfg.channels?.mattermost?.baseUrl).toBe("https://chat.example.com");
          },
        },
        {
          name: "missing credentials are rejected",
          cfg: {} as OpenClawConfig,
          input: {
            httpUrl: "",
          },
          expectedAccountId: "default",
          expectedValidation: "Mattermost requires --bot-token and --http-url (or --use-env).",
        },
      ],
    },
    {
      id: "line",
      cases: [
        {
          name: "default account stores token and secret",
          cfg: {} as OpenClawConfig,
          input: {
            channelAccessToken: "line-token",
            channelSecret: "line-secret",
          },
          expectedAccountId: "default",
          assertPatchedConfig: (cfg) => {
            expect(cfg.channels?.line?.enabled).toBe(true);
            expect(cfg.channels?.line?.channelAccessToken).toBe("line-token");
            expect(cfg.channels?.line?.channelSecret).toBe("line-secret");
          },
        },
        {
          name: "non-default env setup is rejected",
          cfg: {} as OpenClawConfig,
          accountId: "ops",
          input: {
            useEnv: true,
          },
          expectedAccountId: "ops",
          expectedValidation: "LINE_CHANNEL_ACCESS_TOKEN can only be used for the default account.",
        },
      ],
    },
  ]);
  return setupContractRegistryCache;
}

export function getStatusContractRegistry(): StatusContractEntry[] {
  statusContractRegistryCache ??= collectBundledStatusContractEntries([
    {
      id: "slack",
      cases: [
        {
          name: "configured account produces a configured status snapshot",
          cfg: {
            channels: {
              slack: {
                botToken: "xoxb-test",
                appToken: "xapp-test",
              },
            },
          } as OpenClawConfig,
          runtime: {
            accountId: "default",
            connected: true,
            running: true,
          },
          probe: { ok: true },
          assertSnapshot: (snapshot) => {
            expect(snapshot.accountId).toBe("default");
            expect(snapshot.enabled).toBe(true);
            expect(snapshot.configured).toBe(true);
          },
        },
      ],
    },
    {
      id: "mattermost",
      cases: [
        {
          name: "configured account preserves connectivity details in the snapshot",
          cfg: {
            channels: {
              mattermost: {
                enabled: true,
                botToken: "test-token",
                baseUrl: "https://chat.example.com",
              },
            },
          } as OpenClawConfig,
          runtime: {
            accountId: "default",
            connected: true,
            lastConnectedAt: 1234,
          },
          probe: { ok: true },
          assertSnapshot: (snapshot) => {
            expect(snapshot.accountId).toBe("default");
            expect(snapshot.enabled).toBe(true);
            expect(snapshot.configured).toBe(true);
            expect(snapshot.connected).toBe(true);
            expect(snapshot.baseUrl).toBe("https://chat.example.com");
          },
        },
      ],
    },
    {
      id: "line",
      cases: [
        {
          name: "configured account produces a webhook status snapshot",
          cfg: {
            channels: {
              line: {
                enabled: true,
                channelAccessToken: "line-token",
                channelSecret: "line-secret",
              },
            },
          } as OpenClawConfig,
          runtime: {
            accountId: "default",
            running: true,
          },
          probe: { ok: true },
          assertSnapshot: (snapshot) => {
            expect(snapshot.accountId).toBe("default");
            expect(snapshot.enabled).toBe(true);
            expect(snapshot.configured).toBe(true);
            expect(snapshot.mode).toBe("webhook");
          },
        },
      ],
    },
  ]);
  return statusContractRegistryCache;
}
