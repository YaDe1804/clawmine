import type { Counter } from "@opentelemetry/api";
import { metrics } from "@opentelemetry/api";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("gateway-metrics");

function getMeter() {
  return metrics.getMeter("openclaw.gateway");
}

let _authFailureCounter: Counter | null = null;
let _authLockoutCounter: Counter | null = null;
let _httpRequestCounter: Counter | null = null;
let _wsConnectionCounter: Counter | null = null;

function authFailureCounter(): Counter {
  _authFailureCounter ??= getMeter().createCounter("openclaw.gateway.auth.failure", {
    unit: "1",
    description: "Auth failures by scope",
  });
  return _authFailureCounter;
}

function authLockoutCounter(): Counter {
  _authLockoutCounter ??= getMeter().createCounter("openclaw.gateway.auth.lockout", {
    unit: "1",
    description: "IP lockouts triggered",
  });
  return _authLockoutCounter;
}

function httpRequestCounter(): Counter {
  _httpRequestCounter ??= getMeter().createCounter("openclaw.gateway.http.requests", {
    unit: "1",
    description: "HTTP requests by path and status",
  });
  return _httpRequestCounter;
}

function wsConnectionCounter(): Counter {
  _wsConnectionCounter ??= getMeter().createCounter("openclaw.gateway.ws.connections", {
    unit: "1",
    description: "WebSocket connections by outcome",
  });
  return _wsConnectionCounter;
}

export function recordAuthFailure(scope: string): void {
  try {
    authFailureCounter().add(1, { scope });
  } catch (err: unknown) {
    log.debug("gateway metric auth.failure failed", { err });
  }
}

export function recordAuthLockout(scope: string): void {
  try {
    authLockoutCounter().add(1, { scope });
  } catch (err: unknown) {
    log.debug("gateway metric auth.lockout failed", { err });
  }
}

export function recordHttpRequest(path: string, method: string, statusCode: number): void {
  try {
    httpRequestCounter().add(1, {
      path: sanitizeMetricPath(path),
      method,
      status: String(statusCode),
    });
  } catch (err: unknown) {
    log.debug("gateway metric http.requests failed", { err });
  }
}

export function recordWsConnection(outcome: "accepted" | "rejected"): void {
  try {
    wsConnectionCounter().add(1, { outcome });
  } catch (err: unknown) {
    log.debug("gateway metric ws.connections failed", { err });
  }
}

/** Collapse dynamic segments to limit metric cardinality. */
function sanitizeMetricPath(pathname: string): string {
  return pathname
    .replace(/\/sessions\/[^/]+/g, "/sessions/:id")
    .replace(/\/devices\/[^/]+/g, "/devices/:id")
    .replace(/\/[0-9a-f]{8,}/gi, "/:id");
}
