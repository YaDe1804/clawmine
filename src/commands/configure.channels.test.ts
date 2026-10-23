import { beforeEach, describe, expect, it, vi } from "vitest";

const select = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());
const note = vi.hoisted(() => vi.fn());
const chatChannels = vi.hoisted(() =>
  vi.fn(() => [
    { id: "webchat", label: "Webchat" },
    { id: "ollama", label: "Ollama" },
  ]),
);

vi.mock("../channels/chat-meta.js", () => ({
  listChatChannels: () => chatChannels(),
}));

vi.mock("../terminal/note.js", () => ({
  note: (...args: unknown[]) => note(...args),
}));

vi.mock("./configure.shared.js", () => ({
  select: (params: unknown) => select(params),
  confirm: (params: unknown) => confirm(params),
}));

import { removeChannelConfigWizard } from "./configure.channels.js";

const channelChoice = (id: string) => ({ kind: "channel" as const, id });
const doneChoice = { kind: "done" as const };

async function removeUnsafeChannelConfig(unsafeChannel: string) {
  select.mockResolvedValueOnce(channelChoice(unsafeChannel)).mockResolvedValueOnce(doneChoice);

  return removeChannelConfigWizard(
    {
      channels: {
        [unsafeChannel]: { token: "secret" },
        webchat: { token: "secret" },
      },
    } as never,
    {} as never,
  );
}

function expectUnknownChannelRemovalPrompt(unsafeChannel: string, label: string) {
  expect(select).toHaveBeenCalledWith(
    expect.objectContaining({
      options: expect.arrayContaining([
        expect.objectContaining({ value: channelChoice(unsafeChannel), label }),
      ]),
    }),
  );
  expect(confirm).toHaveBeenCalledWith(
    expect.objectContaining({
      message: expect.stringMatching(/openclaw\.json\?$/u),
      initialValue: false,
    }),
  );
  expect(
    String((confirm.mock.calls[0]?.[0] as { message?: string } | undefined)?.message ?? ""),
  ).toContain(label);
  expect(note).toHaveBeenCalledWith(
    `${label} removed from config.\nNote: credentials/sessions on disk are unchanged.`,
    "Channel removed",
  );
}

describe("removeChannelConfigWizard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    chatChannels.mockReturnValue([
      { id: "webchat", label: "Webchat" },
      { id: "ollama", label: "Ollama" },
    ]);
    confirm.mockResolvedValue(true);
  });

  it("lists configured channels from openclaw.json even when no plugins are loaded", async () => {
    select.mockResolvedValue(doneChoice);

    await removeChannelConfigWizard(
      {
        channels: {
          defaults: { groupPolicy: "open" },
          modelByChannel: { openai: { webchat: "gpt-5.4" } },
          ollama: {},
          unknown: {},
          webchat: {},
        },
      } as never,
      {} as never,
    );

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Remove which channel config?",
        options: [
          expect.objectContaining({
            value: channelChoice("ollama"),
            label: "Ollama",
            hint: "Deletes tokens + settings from config (credentials stay on disk)",
          }),
          expect.objectContaining({
            value: channelChoice("unknown"),
            label: "unknown",
            hint: "Deletes tokens + settings from config (credentials stay on disk)",
          }),
          expect.objectContaining({
            value: channelChoice("webchat"),
            label: "Webchat",
            hint: "Deletes tokens + settings from config (credentials stay on disk)",
          }),
          { value: doneChoice, label: "Done" },
        ],
      }),
    );
  });

  it("deletes the selected channel block from openclaw.json", async () => {
    select.mockResolvedValueOnce(channelChoice("webchat")).mockResolvedValueOnce(doneChoice);

    const next = await removeChannelConfigWizard(
      {
        channels: {
          webchat: { token: "secret" },
          ollama: { token: "secret" },
        },
      } as never,
      {} as never,
    );

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/openclaw\.json\?$/),
        initialValue: false,
      }),
    );
    expect(next.channels).toEqual({ ollama: { token: "secret" } });
    expect(note).toHaveBeenCalledWith(
      "Webchat removed from config.\nNote: credentials/sessions on disk are unchanged.",
      "Channel removed",
    );
  });

  it("deletes a real channel block named done", async () => {
    select.mockResolvedValueOnce(channelChoice("done")).mockResolvedValueOnce(doneChoice);

    const next = await removeChannelConfigWizard(
      {
        channels: {
          done: { token: "secret" },
          webchat: { token: "secret" },
        },
      } as never,
      {} as never,
    );

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/openclaw\.json\?$/),
        initialValue: false,
      }),
    );
    expect(next.channels).toEqual({ webchat: { token: "secret" } });
    expect(note).toHaveBeenCalledWith(
      "done removed from config.\nNote: credentials/sessions on disk are unchanged.",
      "Channel removed",
    );
  });

  it("preserves channel-wide defaults when deleting the last channel block", async () => {
    select.mockResolvedValueOnce(channelChoice("webchat")).mockResolvedValueOnce(doneChoice);

    const next = await removeChannelConfigWizard(
      {
        channels: {
          defaults: { groupPolicy: "open" },
          modelByChannel: { openai: { webchat: "gpt-5.4" } },
          webchat: { token: "secret" },
        },
      } as never,
      {} as never,
    );

    expect(next.channels).toEqual({
      defaults: { groupPolicy: "open" },
      modelByChannel: { openai: { webchat: "gpt-5.4" } },
    });
  });

  it("does not list blocked object keys as removable channels", async () => {
    select.mockResolvedValue(doneChoice);

    await removeChannelConfigWizard(
      {
        channels: {
          __proto__: { token: "secret" },
          constructor: { token: "secret" },
          prototype: { token: "secret" },
          webchat: { token: "secret" },
        },
      } as never,
      {} as never,
    );

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          expect.objectContaining({
            value: channelChoice("webchat"),
            label: "Webchat",
            hint: "Deletes tokens + settings from config (credentials stay on disk)",
          }),
          { value: doneChoice, label: "Done" },
        ],
      }),
    );
  });

  it("sanitizes known channel labels before rendering prompts", async () => {
    chatChannels.mockReturnValue([
      { id: "webchat", label: "Webchat\u001B[31m\nBot\u0007" },
      { id: "ollama", label: "Ollama" },
    ]);
    select.mockResolvedValueOnce(channelChoice("webchat")).mockResolvedValueOnce(doneChoice);

    await removeChannelConfigWizard(
      {
        channels: {
          webchat: { token: "secret" },
        },
      } as never,
      {} as never,
    );

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({ value: channelChoice("webchat"), label: "Webchat\\nBot" }),
        ]),
      }),
    );
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/openclaw\.json\?$/),
        initialValue: false,
      }),
    );
    expect(note).toHaveBeenCalledWith(
      "Webchat\\nBot removed from config.\nNote: credentials/sessions on disk are unchanged.",
      "Channel removed",
    );
  });

  it("sanitizes unknown channel keys before rendering prompts", async () => {
    const unsafeChannel = "bad\u001B[31m\nkey\u0007";
    const next = await removeUnsafeChannelConfig(unsafeChannel);

    expectUnknownChannelRemovalPrompt(unsafeChannel, "bad\\nkey");
    expect(next.channels).toEqual({ webchat: { token: "secret" } });
  });

  it("uses a placeholder when an unknown channel key sanitizes to empty", async () => {
    const unsafeChannel = "\u001B[31m\u0007";
    const next = await removeUnsafeChannelConfig(unsafeChannel);

    expectUnknownChannelRemovalPrompt(unsafeChannel, "<invalid channel key>");
    expect(next.channels).toEqual({ webchat: { token: "secret" } });
  });
});
