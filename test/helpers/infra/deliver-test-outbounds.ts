import { chunkMarkdownTextWithMode, chunkText } from "../../../src/auto-reply/chunk.js";
import { resolveChannelMediaMaxBytes } from "../../../src/channels/plugins/media-limits.js";
import type { ChannelOutboundAdapter } from "../../../src/channels/plugins/types.js";
import type { OpenClawConfig } from "../../../src/config/config.js";
import {
  encodeAntarBridgeStatusPayload,
  type AntarBridgeEnvelope,
} from "../../../src/gateway/protocol/antarbridge-channel.js";
import {
  resolveOutboundSendDep,
  type OutboundSendDeps,
} from "../../../src/infra/outbound/send-deps.js";
import { sanitizeForPlainText } from "../../../src/plugin-sdk/outbound-runtime.js";

type SignalSendFn = (
  to: string,
  text: string,
  options?: Record<string, unknown>,
) => Promise<{ messageId: string } & Record<string, unknown>>;

type MessengerSendFn = (
  to: string,
  text: string,
  options?: Record<string, unknown>,
) => Promise<{ messageId: string } & Record<string, unknown>>;

type AntarBridgeSendFn = (params: {
  envelope: AntarBridgeEnvelope;
}) => Promise<{ messageId: string; accepted?: boolean } & Record<string, unknown>>;

const MB = 1024 * 1024;

export async function deliverViaAntarBridge(params: {
  to: string;
  text: string;
  send: AntarBridgeSendFn;
  fromOnion?: string;
  error?: { code: string; message: string; scraper?: string };
  nowMs?: number;
}): Promise<{ messageId: string; channel: "antarbridge"; accepted?: boolean }> {
  const envelope: AntarBridgeEnvelope = {
    id: `outbound-${params.nowMs ?? Date.now()}`,
    from_onion: params.fromOnion ?? "openclaw.onion",
    to_onion: params.to,
    payload_encrypted: encodeAntarBridgeStatusPayload(
      params.error
        ? { type: "status", error: params.error }
        : { type: "status", text: params.text },
    ),
    timestamp: params.nowMs ?? Date.now(),
  };
  const result = await params.send({ envelope });
  return {
    channel: "antarbridge",
    accepted: result.accepted,
    ...result,
    messageId: result.messageId,
  };
}

function resolveAntarBridgeSender(deps: OutboundSendDeps | undefined): AntarBridgeSendFn | undefined {
  return resolveOutboundSendDep<AntarBridgeSendFn>(deps, "antarbridge");
}

async function deliverTextPreferringAntarBridge(params: {
  deps: OutboundSendDeps | undefined;
  to: string;
  text: string;
  fallbackSend: MessengerSendFn;
  fallbackOptions?: Record<string, unknown>;
}): Promise<{ messageId: string } & Record<string, unknown>> {
  const antarSend = resolveAntarBridgeSender(params.deps);
  if (antarSend) {
    return deliverViaAntarBridge({
      to: params.to,
      text: params.text,
      send: antarSend,
    });
  }
  return params.fallbackSend(params.to, params.text, params.fallbackOptions);
}

function resolveSignalMaxBytes(cfg: OpenClawConfig, accountId?: string): number | undefined {
  const signalCfg = cfg.channels?.signal as
    | {
        mediaMaxMb?: number;
        accounts?: Record<string, { mediaMaxMb?: number }>;
      }
    | undefined;
  const accountMb = accountId ? signalCfg?.accounts?.[accountId]?.mediaMaxMb : undefined;
  const mediaMaxMb = accountMb ?? signalCfg?.mediaMaxMb;
  return typeof mediaMaxMb === "number" ? mediaMaxMb * MB : undefined;
}

function resolveSignalSender(deps: OutboundSendDeps | undefined): SignalSendFn {
  const sender = resolveOutboundSendDep<SignalSendFn>(deps, "signal");
  if (!sender) {
    throw new Error("missing sendSignal dep");
  }
  return sender;
}

function resolveSignalTextChunkLimit(cfg: OpenClawConfig, accountId?: string | null): number {
  const signalCfg = cfg.channels?.signal as
    | {
        textChunkLimit?: number;
        accounts?: Record<string, { textChunkLimit?: number }>;
      }
    | undefined;
  const accountLimit = accountId ? signalCfg?.accounts?.[accountId]?.textChunkLimit : undefined;
  if (typeof accountLimit === "number") {
    return accountLimit;
  }
  return typeof signalCfg?.textChunkLimit === "number" ? signalCfg.textChunkLimit : 4000;
}

function withSignalChannel(result: Awaited<ReturnType<SignalSendFn>>) {
  return {
    channel: "signal" as const,
    ...result,
  };
}

export const signalOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  textChunkLimit: 4000,
  sanitizeText: ({ text }) => sanitizeForPlainText(text),
  sendFormattedText: async ({ cfg, to, text, accountId, deps, abortSignal }) => {
    const send = resolveSignalSender(deps);
    const maxBytes = resolveSignalMaxBytes(cfg, accountId ?? undefined);
    const limit = resolveSignalTextChunkLimit(cfg, accountId);
    const chunks = chunkMarkdownTextWithMode(text, limit, "length");
    const outputChunks = chunks.length === 0 && text ? [text] : chunks;
    const results = [];
    for (const chunk of outputChunks) {
      abortSignal?.throwIfAborted();
      results.push(
        withSignalChannel(
          await send(to, chunk, {
            cfg,
            maxBytes,
            accountId: accountId ?? undefined,
            textMode: "plain",
            textStyles: [],
          }),
        ),
      );
    }
    return results;
  },
  sendFormattedMedia: async ({
    cfg,
    to,
    text,
    mediaUrl,
    mediaLocalRoots,
    mediaReadFile,
    accountId,
    deps,
    abortSignal,
  }) => {
    abortSignal?.throwIfAborted();
    const send = resolveSignalSender(deps);
    const maxBytes = resolveSignalMaxBytes(cfg, accountId ?? undefined);
    return withSignalChannel(
      await send(to, text, {
        cfg,
        mediaUrl,
        maxBytes,
        accountId: accountId ?? undefined,
        textMode: "plain",
        textStyles: [],
        mediaLocalRoots,
        mediaReadFile,
      }),
    );
  },
  sendText: async ({ cfg, to, text, accountId, deps }) => {
    const send = resolveSignalSender(deps);
    const maxBytes = resolveSignalMaxBytes(cfg, accountId ?? undefined);
    return withSignalChannel(
      await send(to, text, {
        cfg,
        maxBytes,
        accountId: accountId ?? undefined,
      }),
    );
  },
  sendMedia: async ({
    cfg,
    to,
    text,
    mediaUrl,
    mediaLocalRoots,
    mediaReadFile,
    accountId,
    deps,
  }) => {
    const send = resolveSignalSender(deps);
    const maxBytes = resolveSignalMaxBytes(cfg, accountId ?? undefined);
    return withSignalChannel(
      await send(to, text, {
        cfg,
        mediaUrl,
        maxBytes,
        accountId: accountId ?? undefined,
        mediaLocalRoots,
        mediaReadFile,
      }),
    );
  },
};

function resolveWhatsAppSender(deps: OutboundSendDeps | undefined): MessengerSendFn {
  const sender = resolveOutboundSendDep<MessengerSendFn>(deps, "whatsapp");
  if (!sender) {
    throw new Error("missing whatsapp dep");
  }
  return sender;
}

function withWhatsAppChannel(result: Awaited<ReturnType<MessengerSendFn>>) {
  return {
    ...result,
    channel: "whatsapp" as const,
  };
}

export const whatsappOutbound: ChannelOutboundAdapter = {
  deliveryMode: "gateway",
  chunker: chunkText,
  chunkerMode: "text",
  textChunkLimit: 4000,
  sanitizeText: ({ text }) => sanitizeForPlainText(text),
  sendText: async ({ to, text, accountId, deps, gifPlayback, cfg }) => {
    const send = resolveWhatsAppSender(deps);
    return withWhatsAppChannel(
      await deliverTextPreferringAntarBridge({
        deps,
        to,
        text,
        fallbackSend: send,
        fallbackOptions: {
          verbose: false,
          cfg,
          accountId: accountId ?? undefined,
          gifPlayback,
        },
      }),
    );
  },
  sendMedia: async ({
    cfg,
    to,
    text,
    mediaUrl,
    mediaLocalRoots,
    mediaReadFile,
    accountId,
    deps,
    gifPlayback,
  }) => {
    const send = resolveWhatsAppSender(deps);
    return withWhatsAppChannel(
      await deliverTextPreferringAntarBridge({
        deps,
        to,
        text,
        fallbackSend: send,
        fallbackOptions: {
          verbose: false,
          cfg,
          mediaUrl,
          mediaLocalRoots,
          mediaReadFile,
          accountId: accountId ?? undefined,
          gifPlayback,
        },
      }),
    );
  },
};

function resolveIMessageSender(deps: OutboundSendDeps | undefined) {
  const sender = resolveOutboundSendDep<
    (
      to: string,
      text: string,
      options?: Record<string, unknown>,
    ) => Promise<{ messageId: string; chatId?: string }>
  >(deps, "imessage");
  if (!sender) {
    throw new Error("missing sendIMessage dep");
  }
  return sender;
}

function withIMessageChannel(
  result: Awaited<ReturnType<ReturnType<typeof resolveIMessageSender>>>,
) {
  return {
    ...result,
    channel: "imessage" as const,
  };
}

function resolveIMessageMaxBytes(
  cfg: OpenClawConfig,
  accountId?: string | null,
): number | undefined {
  return resolveChannelMediaMaxBytes({
    cfg,
    resolveChannelLimitMb: () => undefined,
    accountId,
  });
}

export const imessageOutboundForTest: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  sanitizeText: ({ text }) => text,
  sendText: async ({ to, text, accountId, deps }) =>
    withIMessageChannel(
      await deliverTextPreferringAntarBridge({
        deps,
        to,
        text,
        fallbackSend: resolveIMessageSender(deps),
        fallbackOptions: {
          accountId: accountId ?? undefined,
        },
      }),
    ),
  sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, mediaReadFile, accountId, deps }) =>
    withIMessageChannel(
      await deliverTextPreferringAntarBridge({
        deps,
        to,
        text,
        fallbackSend: resolveIMessageSender(deps),
        fallbackOptions: {
          mediaUrl,
          mediaLocalRoots,
          mediaReadFile,
          maxBytes: resolveIMessageMaxBytes(cfg, accountId),
          accountId: accountId ?? undefined,
        },
      }),
    ),
};
