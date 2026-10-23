import { afterEach, describe, expect, it, vi } from "vitest";

const loadShellEnvFallbackMock = vi.fn();
const collectProviderApiKeysMock = vi.fn((provider: string) =>
  process.env[`TEST_AUTH_${provider.toUpperCase()}`] ? ["test-key"] : [],
);

vi.mock("../../src/infra/shell-env.js", () => ({
  loadShellEnvFallback: loadShellEnvFallbackMock,
}));

vi.mock("../../src/agents/live-auth-keys.js", () => ({
  collectProviderApiKeys: collectProviderApiKeysMock,
}));

describe("test-live-media", () => {
  afterEach(() => {
    collectProviderApiKeysMock.mockClear();
    loadShellEnvFallbackMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("defaults to image suite with auth filtering", async () => {
    vi.stubEnv("TEST_AUTH_OPENAI", "1");
    vi.stubEnv("TEST_AUTH_GOOGLE", "1");
    vi.stubEnv("TEST_AUTH_MINIMAX", "1");
    vi.stubEnv("TEST_AUTH_FAL", "1");
    vi.stubEnv("TEST_AUTH_VYDRA", "1");

    const { buildRunPlan, parseArgs } = await import("../../scripts/test-live-media.ts");
    const plan = buildRunPlan(parseArgs([]));

    expect(plan.map((entry) => entry.suite.id)).toEqual(["image"]);
    expect(plan.find((entry) => entry.suite.id === "image")?.providers).toEqual([
      "fal",
      "google",
      "minimax",
      "openai",
      "vydra",
    ]);
  });

  it("supports image provider filters without auth narrowing", async () => {
    const { buildRunPlan, parseArgs } = await import("../../scripts/test-live-media.ts");
    const plan = buildRunPlan(
      parseArgs(["image", "--image-providers", "fal,openai", "--all-providers"]),
    );

    expect(plan).toHaveLength(1);
    expect(plan[0]?.suite.id).toBe("image");
    expect(plan[0]?.providers).toEqual(["fal", "openai"]);
  });

  it("forwards quiet flags separately from passthrough args", async () => {
    const { parseArgs } = await import("../../scripts/test-live-media.ts");
    const options = parseArgs(["image", "--quiet", "--reporter", "dot"]);

    expect(options.suites).toEqual(["image"]);
    expect(options.quietArgs).toEqual(["--quiet"]);
    expect(options.passthroughArgs).toEqual(["--reporter", "dot"]);
  });
});
