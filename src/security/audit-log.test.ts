import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  __resetAuditLogForTest,
  auditAuthFailure,
  auditAuthLockout,
  initAuditLog,
  writeAuditEvent,
} from "./audit-log.js";

describe("audit-log", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    __resetAuditLogForTest();
    for (const dir of tempDirs.splice(0)) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writeAuditEvent appends a JSON line to audit.log", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "openclaw-audit-"));
    tempDirs.push(root);
    initAuditLog(root);
    await writeAuditEvent({
      ts: 1_714_000_000_000,
      kind: "gateway.start",
      severity: "info",
      detail: { version: "test" },
    });
    const content = await readFile(path.join(root, "audit.log"), "utf8");
    const line = content.trim();
    expect(line).toBeDefined();
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed.kind).toBe("gateway.start");
    expect(parsed.ts).toBe(1_714_000_000_000);
    expect(parsed.severity).toBe("info");
  });

  it("auditAuthLockout writes a critical event", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "openclaw-audit-"));
    tempDirs.push(root);
    initAuditLog(root);
    await auditAuthLockout("10.0.0.1", "shared-secret", 300_000);
    const line = (await readFile(path.join(root, "audit.log"), "utf8")).trim();
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed.kind).toBe("auth.lockout");
    expect(parsed.severity).toBe("critical");
    expect(parsed.ip).toBe("10.0.0.1");
  });

  it("auditAuthFailure writes a warn event", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "openclaw-audit-"));
    tempDirs.push(root);
    initAuditLog(root);
    await auditAuthFailure("10.0.0.2", "device-token", 3);
    const line = (await readFile(path.join(root, "audit.log"), "utf8")).trim();
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed.kind).toBe("auth.failure");
    expect(parsed.severity).toBe("warn");
    expect(parsed.ip).toBe("10.0.0.2");
  });

  it("writeAuditEvent without initAuditLog does not throw (no file)", async () => {
    __resetAuditLogForTest();
    await expect(
      writeAuditEvent({ ts: 1, kind: "gateway.stop", severity: "info" }),
    ).resolves.toBeUndefined();
  });

  it("appends multiple events as separate lines", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "openclaw-audit-"));
    tempDirs.push(root);
    initAuditLog(root);
    await writeAuditEvent({ ts: 1, kind: "gateway.start", severity: "info" });
    await writeAuditEvent({ ts: 2, kind: "gateway.stop", severity: "info" });
    const content = await readFile(path.join(root, "audit.log"), "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({ kind: "gateway.start", ts: 1 });
    expect(JSON.parse(lines[1] ?? "{}")).toMatchObject({ kind: "gateway.stop", ts: 2 });
  });
});
