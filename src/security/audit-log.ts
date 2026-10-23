import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("audit");

export type AuditEventKind =
  | "auth.failure"
  | "auth.lockout"
  | "auth.success"
  | "auth.lockout.cleared"
  | "config.dangerous_flag"
  | "config.reload"
  | "injection.detected"
  | "gateway.start"
  | "gateway.stop"
  | "session.start"
  | "session.end"
  | "plugin.install"
  | "plugin.remove";

export type AuditEvent = {
  ts: number;
  kind: AuditEventKind;
  severity: "info" | "warn" | "critical";
  actor?: string;
  ip?: string;
  detail?: Record<string, unknown>;
};

let auditLogPath: string | null = null;

export function initAuditLog(stateDir: string): void {
  auditLogPath = path.join(stateDir, "audit.log");
}

export function getAuditLogPath(): string | null {
  return auditLogPath;
}

/** Test-only: clear configured path so persistence is disabled. */
export function __resetAuditLogForTest(): void {
  auditLogPath = null;
}

export async function writeAuditEvent(event: AuditEvent): Promise<void> {
  const ts = event.ts ?? Date.now();
  const line = `${JSON.stringify({ ...event, ts })}\n`;

  const logFn =
    event.severity === "critical" ? log.error : event.severity === "warn" ? log.warn : log.info;
  logFn(`${event.kind}${event.detail ? ` ${JSON.stringify(event.detail)}` : ""}`);

  if (!auditLogPath) {
    return;
  }

  try {
    await mkdir(path.dirname(auditLogPath), { recursive: true });
    await appendFile(auditLogPath, line, "utf8");
  } catch (err: unknown) {
    log.debug("audit-log: appendFile failed during write", { err });
  }
}

export const auditAuthFailure = (ip: string, scope: string, attempts: number) =>
  writeAuditEvent({
    ts: Date.now(),
    kind: "auth.failure",
    severity: "warn",
    ip,
    detail: { scope, attempts },
  });

export const auditAuthLockout = (ip: string, scope: string, durationMs: number) =>
  writeAuditEvent({
    ts: Date.now(),
    kind: "auth.lockout",
    severity: "critical",
    ip,
    detail: { scope, durationMs },
  });

export const auditAuthSuccess = (actor: string, ip: string) =>
  writeAuditEvent({
    ts: Date.now(),
    kind: "auth.success",
    severity: "info",
    actor,
    ip,
  });

export const auditDangerousFlag = (flag: string) =>
  writeAuditEvent({
    ts: Date.now(),
    kind: "config.dangerous_flag",
    severity: "critical",
    detail: { flag },
  });

export const auditInjectionDetected = (pattern: string, source: string) =>
  writeAuditEvent({
    ts: Date.now(),
    kind: "injection.detected",
    severity: "critical",
    detail: { pattern, source },
  });

export const auditGatewayStart = (version: string) =>
  writeAuditEvent({
    ts: Date.now(),
    kind: "gateway.start",
    severity: "info",
    detail: { version },
  });

export const auditConfigReload = (actor: string, changedPaths: string[]) =>
  writeAuditEvent({
    ts: Date.now(),
    kind: "config.reload",
    severity: "info",
    actor,
    detail: { changedPaths },
  });
