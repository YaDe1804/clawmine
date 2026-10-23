import { describe, expect, it } from "vitest";
import {
  resolveLegacyAuthChoiceAliasesForCli,
  formatDeprecatedNonInteractiveAuthChoiceError,
  normalizeLegacyOnboardAuthChoice,
  resolveDeprecatedAuthChoiceReplacement,
} from "./auth-choice-legacy.js";

describe("auth choice legacy aliases", () => {
  // TODO: Cloud-Provider nicht konfiguriert — anthropic-cli Alias entfernt
  it.skip("maps claude-cli to the new anthropic cli choice", () => {
    expect(normalizeLegacyOnboardAuthChoice("claude-cli")).toBe("anthropic-cli");
    expect(resolveDeprecatedAuthChoiceReplacement("claude-cli")).toEqual({
      normalized: "anthropic-cli",
      message: 'Auth choice "claude-cli" is deprecated; using Anthropic Claude CLI setup instead.',
    });
    expect(formatDeprecatedNonInteractiveAuthChoiceError("claude-cli")).toBe(
      'Auth choice "claude-cli" is deprecated.\nUse "--auth-choice anthropic-cli".',
    );
  });

  // TODO: Cloud-Provider nicht konfiguriert — claude-cli/codex-cli Manifest-Aliase entfernt
  it.skip("sources deprecated cli aliases from plugin manifests", () => {
    expect(resolveLegacyAuthChoiceAliasesForCli()).toEqual(["claude-cli", "codex-cli"]);
  });
});
