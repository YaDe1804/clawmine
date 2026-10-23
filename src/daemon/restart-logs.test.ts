import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  GATEWAY_RESTART_LOG_FILENAME,
  renderCmdRestartLogSetup,
  renderPosixRestartLogSetup,
  resolveGatewayLogPaths,
  resolveGatewayRestartLogPath,
} from "./restart-logs.js";

describe("restart log conventions", () => {
  it("resolves profile-aware gateway logs and restart attempts together", () => {
    const env = {
      HOME: "/Users/test",
      OPENCLAW_PROFILE: "work",
    };

    expect(resolveGatewayLogPaths(env)).toEqual({
      logDir: path.join("/Users/test", ".openclaw-work", "logs"),
      stdoutPath: path.join("/Users/test", ".openclaw-work", "logs", "gateway.log"),
      stderrPath: path.join("/Users/test", ".openclaw-work", "logs", "gateway.err.log"),
    });
    expect(resolveGatewayRestartLogPath(env)).toBe(
      path.join("/Users/test", ".openclaw-work", "logs", GATEWAY_RESTART_LOG_FILENAME),
    );
  });

  it("honors OPENCLAW_STATE_DIR for restart attempts", () => {
    const stateDir = path.resolve("/tmp/openclaw-state");
    const env = {
      HOME: "/Users/test",
      OPENCLAW_STATE_DIR: "/tmp/openclaw-state",
    };

    expect(resolveGatewayRestartLogPath(env)).toBe(
      path.join(stateDir, "logs", GATEWAY_RESTART_LOG_FILENAME),
    );
  });

  // TODO: Windows-Dienst via deploy/openclaw.service
  it.skipIf(process.platform === "win32")(
    "renders best-effort POSIX log setup with escaped paths",
    () => {
    const setup = renderPosixRestartLogSetup({
      HOME: "/Users/test's",
    });

    expect(setup).toContain(
      "if mkdir -p '/Users/test'\\''s/.openclaw/logs' 2>/dev/null && : >>'/Users/test'\\''s/.openclaw/logs/gateway-restart.log' 2>/dev/null; then",
    );
    expect(setup).toContain("exec >>'/Users/test'\\''s/.openclaw/logs/gateway-restart.log' 2>&1");
  });

  it("renders CMD log setup with quoted paths", () => {
    const userProfile = "C:\\Users\\Test User";
    const logDir = path.join(userProfile, ".openclaw", "logs");
    const logPath = path.join(logDir, GATEWAY_RESTART_LOG_FILENAME);
    const setup = renderCmdRestartLogSetup({
      USERPROFILE: userProfile,
    });

    expect(setup.quotedLogPath).toBe(`"${logPath}"`);
    expect(setup.lines).toContain(`if not exist "${logDir}" mkdir "${logDir}" >nul 2>&1`);
  });
});
