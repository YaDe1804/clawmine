import { getBundledChannelPlugin } from "../../../src/channels/plugins/bundled.js";
import type { ChannelPlugin } from "../../../src/channels/plugins/types.js";
import type { OpenClawConfig } from "../../../src/config/config.js";

type ActionsContractEntry = {
  id: string;
  plugin: Pick<ChannelPlugin, "id" | "actions">;
  unsupportedAction?: string;
  cases: Array<{
    name: string;
    cfg: OpenClawConfig;
    expectedActions: string[];
    expectedCapabilities?: string[];
    beforeTest?: () => void;
  }>;
};

let actionContractRegistryCache: ActionsContractEntry[] | undefined;

type ActionsContractDef = Omit<ActionsContractEntry, "plugin"> & { id: string };

function collectBundledActionsContractEntries(defs: readonly ActionsContractDef[]): ActionsContractEntry[] {
  const out: ActionsContractEntry[] = [];
  for (const def of defs) {
    const loaded = getBundledChannelPlugin(def.id);
    if (!loaded) {
      continue;
    }
    out.push({
      id: def.id,
      cases: def.cases,
      unsupportedAction: def.unsupportedAction,
      plugin: {
        id: loaded.id,
        actions: loaded.actions,
      },
    });
  }
  return out;
}

export function getActionContractRegistry(): ActionsContractEntry[] {
  actionContractRegistryCache ??= collectBundledActionsContractEntries([
    {
      id: "slack",
      unsupportedAction: "poll",
      cases: [
        {
          name: "configured account exposes default Slack actions",
          cfg: {
            channels: {
              slack: {
                botToken: "xoxb-test",
                appToken: "xapp-test",
              },
            },
          } as OpenClawConfig,
          expectedActions: [
            "send",
            "react",
            "reactions",
            "read",
            "edit",
            "delete",
            "download-file",
            "upload-file",
            "pin",
            "unpin",
            "list-pins",
            "member-info",
            "emoji-list",
          ],
          expectedCapabilities: ["blocks"],
        },
        {
          name: "interactive replies add the shared interactive capability",
          cfg: {
            channels: {
              slack: {
                botToken: "xoxb-test",
                appToken: "xapp-test",
                capabilities: {
                  interactiveReplies: true,
                },
              },
            },
          } as OpenClawConfig,
          expectedActions: [
            "send",
            "react",
            "reactions",
            "read",
            "edit",
            "delete",
            "download-file",
            "upload-file",
            "pin",
            "unpin",
            "list-pins",
            "member-info",
            "emoji-list",
          ],
          expectedCapabilities: ["blocks", "interactive"],
        },
        {
          name: "missing tokens disables the actions surface",
          cfg: {
            channels: {
              slack: {
                enabled: true,
              },
            },
          } as OpenClawConfig,
          expectedActions: [],
          expectedCapabilities: [],
        },
      ],
    },
    {
      id: "mattermost",
      unsupportedAction: "poll",
      cases: [
        {
          name: "configured account exposes send and react",
          cfg: {
            channels: {
              mattermost: {
                enabled: true,
                botToken: "test-token",
                baseUrl: "https://chat.example.com",
              },
            },
          } as OpenClawConfig,
          expectedActions: ["send", "react"],
          expectedCapabilities: ["buttons"],
        },
        {
          name: "reactions can be disabled while send stays available",
          cfg: {
            channels: {
              mattermost: {
                enabled: true,
                botToken: "test-token",
                baseUrl: "https://chat.example.com",
                actions: { reactions: false },
              },
            },
          } as OpenClawConfig,
          expectedActions: ["send"],
          expectedCapabilities: ["buttons"],
        },
        {
          name: "missing bot credentials disables the actions surface",
          cfg: {
            channels: {
              mattermost: {
                enabled: true,
              },
            },
          } as OpenClawConfig,
          expectedActions: [],
          expectedCapabilities: [],
        },
      ],
    },
    {
      id: "telegram",
      cases: [
        {
          name: "exposes configured Telegram actions and capabilities",
          cfg: {
            channels: {
              telegram: {
                botToken: "123:telegram-test-token",
              },
            },
          } as OpenClawConfig,
          expectedActions: [
            "send",
            "poll",
            "react",
            "delete",
            "edit",
            "topic-create",
            "topic-edit",
          ],
          expectedCapabilities: ["interactive", "buttons"],
        },
      ],
    },
    {
      id: "discord",
      cases: [
        {
          name: "describes configured Discord actions and capabilities",
          cfg: {
            channels: {
              discord: {
                token: "Bot token-main",
                actions: {
                  polls: true,
                  reactions: true,
                  permissions: false,
                  messages: false,
                  pins: false,
                  threads: false,
                  search: false,
                  stickers: false,
                  memberInfo: false,
                  roleInfo: false,
                  emojiUploads: false,
                  stickerUploads: false,
                  channelInfo: false,
                  channels: false,
                  voiceStatus: false,
                  events: false,
                  roles: false,
                  moderation: false,
                  presence: false,
                },
              },
            },
          } as OpenClawConfig,
          expectedActions: ["send", "poll", "react", "reactions", "emoji-list"],
          expectedCapabilities: ["interactive", "components"],
        },
      ],
    },
  ]);
  return actionContractRegistryCache;
}
