import { describe, expect, it, vi } from "vitest";
import {
  buildOutboundDeliveryJson,
  formatGatewaySummary,
  formatOutboundDeliverySummary,
} from "./format.js";

const getChannelPluginMock = vi.hoisted(() => vi.fn((_channel: unknown) => undefined));

vi.mock("../../channels/plugins/index.js", () => ({
  getLoadedChannelPlugin: getChannelPluginMock,
  getChannelPlugin: getChannelPluginMock,
}));
describe("formatOutboundDeliverySummary", () => {
  it.each([
    {
      channel: "antarbridge" as const,
      result: undefined,
      expected: "✅ Sent via antarbridge. Message ID: unknown",
    },
    {
      channel: "antarbridge" as const,
      result: {
        channel: "antarbridge" as const,
        messageId: "m1",
        chatId: "c1",
      },
      expected: "✅ Sent via antarbridge. Message ID: m1 (chat c1)",
    },
    {
      channel: "antarbridge" as const,
      result: {
        channel: "antarbridge" as const,
        messageId: "d1",
        channelId: "chan",
      },
      expected: "✅ Sent via antarbridge. Message ID: d1 (channel chan)",
    },
    {
      channel: "antarbridge" as const,
      result: {
        channel: "antarbridge" as const,
        messageId: "s1",
        roomId: "room-1",
      },
      expected: "✅ Sent via antarbridge. Message ID: s1 (room room-1)",
    },
    {
      channel: "antarbridge" as const,
      result: {
        channel: "antarbridge" as const,
        messageId: "t1",
        conversationId: "conv-1",
      },
      expected: "✅ Sent via antarbridge. Message ID: t1 (conversation conv-1)",
    },
  ])("formats delivery summary for %j", ({ channel, result, expected }) => {
    expect(formatOutboundDeliverySummary(channel, result)).toBe(expected);
  });
});

describe("buildOutboundDeliveryJson", () => {
  it.each([
    {
      input: {
        channel: "antarbridge" as const,
        to: "123",
        result: { channel: "antarbridge" as const, messageId: "m1", chatId: "c1" },
        mediaUrl: "https://example.com/a.png",
      },
      expected: {
        channel: "antarbridge",
        via: "direct",
        to: "123",
        messageId: "m1",
        mediaUrl: "https://example.com/a.png",
        chatId: "c1",
      },
    },
    {
      input: {
        channel: "antarbridge" as const,
        to: "openclaw.onion",
        result: { channel: "antarbridge" as const, messageId: "w1", toJid: "jid" },
      },
      expected: {
        channel: "antarbridge",
        via: "direct",
        to: "openclaw.onion",
        messageId: "w1",
        mediaUrl: null,
        toJid: "jid",
      },
    },
    {
      input: {
        channel: "signal" as const,
        to: "+1",
        result: { channel: "signal" as const, messageId: "s1", timestamp: 123 },
      },
      expected: {
        channel: "signal",
        via: "direct",
        to: "+1",
        messageId: "s1",
        mediaUrl: null,
        timestamp: 123,
      },
    },
    {
      input: {
        channel: "antarbridge" as const,
        to: "channel:1",
        via: "gateway" as const,
        result: {
          messageId: "g1",
          channelId: "1",
          meta: { thread: "2" },
        },
      },
      expected: {
        channel: "antarbridge",
        via: "gateway",
        to: "channel:1",
        messageId: "g1",
        mediaUrl: null,
        channelId: "1",
        meta: { thread: "2" },
      },
    },
  ])("builds delivery JSON for %j", ({ input, expected }) => {
    expect(buildOutboundDeliveryJson(input)).toEqual(expected);
  });
});

describe("formatGatewaySummary", () => {
  it.each([
    {
      input: { channel: "antarbridge", messageId: "m1" },
      expected: "✅ Sent via gateway (antarbridge). Message ID: m1",
    },
    {
      input: { action: "Poll sent", channel: "antarbridge", messageId: "p1" },
      expected: "✅ Poll sent via gateway (antarbridge). Message ID: p1",
    },
    {
      input: {},
      expected: "✅ Sent via gateway. Message ID: unknown",
    },
  ])("formats gateway summary for %j", ({ input, expected }) => {
    expect(formatGatewaySummary(input)).toBe(expected);
  });
});
