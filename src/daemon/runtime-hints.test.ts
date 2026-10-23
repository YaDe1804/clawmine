import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPlatformRuntimeLogHints, buildPlatformServiceStartHints } from "./runtime-hints.js";

const TEST_STATE_DIR = path.join(os.tmpdir(), "openclaw-state");

describe("buildPlatformRuntimeLogHints", () => {
  // TODO: launchd nicht auf Windows
  it.skipIf(process.platform === "win32")("renders launchd log hints on darwin", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        env: {
          OPENCLAW_STATE_DIR: "/tmp/openclaw-state",
          OPENCLAW_LOG_PREFIX: "gateway",
        },
        systemdServiceName: "openclaw-gateway",
        windowsTaskName: "OpenClaw Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /tmp/openclaw-state/logs/gateway.log",
      "Launchd stderr (if installed): /tmp/openclaw-state/logs/gateway.err.log",
      "Restart attempts: /tmp/openclaw-state/logs/gateway-restart.log",
    ]);
  });

  it("renders systemd and windows hints by platform", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "linux",
        env: {
          OPENCLAW_STATE_DIR: TEST_STATE_DIR,
        },
        systemdServiceName: "openclaw-gateway",
        windowsTaskName: "OpenClaw Gateway",
      }),
    ).toEqual([
      "Logs: journalctl --user -u openclaw-gateway.service -n 200 --no-pager",
      `Restart attempts: ${path.join(TEST_STATE_DIR, "logs", "gateway-restart.log")}`,
    ]);
    expect(
      buildPlatformRuntimeLogHints({
        platform: "win32",
        env: {
          OPENCLAW_STATE_DIR: TEST_STATE_DIR,
        },
        systemdServiceName: "openclaw-gateway",
        windowsTaskName: "OpenClaw Gateway",
      }),
    ).toEqual([
      'Logs: schtasks /Query /TN "OpenClaw Gateway" /V /FO LIST',
      `Restart attempts: ${path.join(TEST_STATE_DIR, "logs", "gateway-restart.log")}`,
    ]);
  });
});

describe("buildPlatformServiceStartHints", () => {
  // TODO: launchd/systemd nicht auf Windows
  it.skipIf(process.platform === "win32")("builds platform-specific service start hints", () => {
    expect(
      buildPlatformServiceStartHints({
        platform: "darwin",
        installCommand: "openclaw gateway install",
        startCommand: "openclaw gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.openclaw.gateway.plist",
        systemdServiceName: "openclaw-gateway",
        windowsTaskName: "OpenClaw Gateway",
      }),
    ).toEqual([
      "openclaw gateway install",
      "openclaw gateway",
      "launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.openclaw.gateway.plist",
    ]);
    expect(
      buildPlatformServiceStartHints({
        platform: "linux",
        installCommand: "openclaw gateway install",
        startCommand: "openclaw gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.openclaw.gateway.plist",
        systemdServiceName: "openclaw-gateway",
        windowsTaskName: "OpenClaw Gateway",
      }),
    ).toEqual([
      "openclaw gateway install",
      "openclaw gateway",
      "systemctl --user start openclaw-gateway.service",
    ]);
  });
});
