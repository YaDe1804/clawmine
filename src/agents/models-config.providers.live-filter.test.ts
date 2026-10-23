import { describe, expect, it } from "vitest";
import { resolveProviderDiscoveryFilterForTest } from "./models-config.providers.implicit.js";

describe("resolveProviderDiscoveryFilterForTest", () => {
  // TODO: local-only providers — Anthropic / claude-cli removed
  it.skip("maps live provider backend ids to owning plugin ids", () => {
    expect(
      resolveProviderDiscoveryFilterForTest({
        env: {
          OPENCLAW_LIVE_TEST: "1",
          OPENCLAW_LIVE_PROVIDERS: "claude-cli",
          VITEST: "1",
        } as NodeJS.ProcessEnv,
      }),
    ).toEqual(["anthropic"]);
  });

  // TODO: local-only providers — Anthropic / claude-cli removed
  it.skip("honors gateway live provider filters too", () => {
    expect(
      resolveProviderDiscoveryFilterForTest({
        env: {
          OPENCLAW_LIVE_TEST: "1",
          OPENCLAW_LIVE_GATEWAY_PROVIDERS: "claude-cli",
          VITEST: "1",
        } as NodeJS.ProcessEnv,
      }),
    ).toEqual(["anthropic"]);
  });

  // TODO: local-only providers — OpenRouter cloud plugin removed
  it.skip("keeps explicit plugin-id filters when no owning provider plugin exists", () => {
    expect(
      resolveProviderDiscoveryFilterForTest({
        env: {
          OPENCLAW_LIVE_TEST: "1",
          OPENCLAW_LIVE_PROVIDERS: "openrouter",
          VITEST: "1",
        } as NodeJS.ProcessEnv,
      }),
    ).toEqual(["openrouter"]);
  });
});
