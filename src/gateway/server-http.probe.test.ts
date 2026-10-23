import { describe, expect, it } from "vitest";
import type { HealthSummary } from "../commands/health.types.js";
import {
  AUTH_TOKEN,
  AUTH_NONE,
  createRequest,
  createResponse,
  dispatchRequest,
  withGatewayServer,
} from "./server-http.test-harness.js";
import type { ReadinessChecker } from "./server/readiness.js";
import { withTempConfig } from "./test-temp-config.js";

function createHealthFixture(overrides: Partial<HealthSummary> = {}): HealthSummary {
  return {
    ok: true,
    ts: 1_714_000_000_000,
    durationMs: 12,
    channels: {},
    channelOrder: [],
    channelLabels: {},
    heartbeatSeconds: 30,
    defaultAgentId: "main",
    agents: [],
    sessions: { path: "/tmp/sessions", count: 0, recent: [] },
    ...overrides,
  };
}

describe("gateway OpenAI-compatible disabled HTTP routes", () => {
  it("returns 404 when compat endpoints are disabled", async () => {
    await withGatewayServer({
      prefix: "openai-compat-disabled",
      resolvedAuth: AUTH_NONE,
      run: async (server) => {
        for (const path of ["/v1/chat/completions", "/v1/responses"]) {
          const req = createRequest({
            path,
            method: "POST",
            headers: { "content-type": "application/json" },
          });
          const { res, getBody } = createResponse();
          await dispatchRequest(server, req, res);

          expect(res.statusCode, path).toBe(404);
          expect(getBody(), path).toBe("Not Found");
        }
      },
    });
  });
});

describe("gateway probe endpoints", () => {
  it("returns detailed readiness payload for local /ready requests", async () => {
    const getReadiness: ReadinessChecker = () => ({
      ready: true,
      failing: [],
      uptimeMs: 45_000,
    });

    await withGatewayServer({
      prefix: "probe-ready",
      resolvedAuth: AUTH_NONE,
      overrides: { getReadiness },
      run: async (server) => {
        const req = createRequest({ path: "/ready" });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(getBody())).toEqual({ ready: true, failing: [], uptimeMs: 45_000 });
      },
    });
  });

  it("returns only readiness state for unauthenticated remote /ready requests", async () => {
    const getReadiness: ReadinessChecker = () => ({
      ready: false,
      failing: ["discord", "telegram"],
      uptimeMs: 8_000,
    });

    await withGatewayServer({
      prefix: "probe-not-ready",
      resolvedAuth: AUTH_NONE,
      overrides: { getReadiness },
      run: async (server) => {
        const req = createRequest({
          path: "/ready",
          remoteAddress: "10.0.0.8",
          host: "gateway.test",
        });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(503);
        expect(JSON.parse(getBody())).toEqual({ ready: false });
      },
    });
  });

  it("returns detailed readiness payload for authenticated remote /ready requests", async () => {
    const getReadiness: ReadinessChecker = () => ({
      ready: false,
      failing: ["discord", "telegram"],
      uptimeMs: 8_000,
    });

    await withGatewayServer({
      prefix: "probe-remote-authenticated",
      resolvedAuth: AUTH_TOKEN,
      overrides: { getReadiness },
      run: async (server) => {
        const req = createRequest({
          path: "/ready",
          remoteAddress: "10.0.0.8",
          host: "gateway.test",
          authorization: "Bearer test-token",
        });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(503);
        expect(JSON.parse(getBody())).toEqual({
          ready: false,
          failing: ["discord", "telegram"],
          uptimeMs: 8_000,
        });
      },
    });
  });

  it("re-resolves auth for remote /ready requests after shared auth rotation", async () => {
    const getReadiness: ReadinessChecker = () => ({
      ready: false,
      failing: ["discord", "telegram"],
      uptimeMs: 8_000,
    });
    let currentAuth = AUTH_TOKEN;

    await withGatewayServer({
      prefix: "probe-remote-rotated-auth",
      // `resolvedAuth` remains the static fallback; `getResolvedAuth` drives the rotated value.
      resolvedAuth: AUTH_TOKEN,
      overrides: {
        getReadiness,
        getResolvedAuth: () => currentAuth,
      },
      run: async (server) => {
        const sendReady = async (authorization: string) => {
          const req = createRequest({
            path: "/ready",
            remoteAddress: "10.0.0.8",
            host: "gateway.test",
            authorization,
          });
          const { res, getBody } = createResponse();
          await dispatchRequest(server, req, res);
          return { statusCode: res.statusCode, body: JSON.parse(getBody()) };
        };

        await expect(sendReady("Bearer test-token")).resolves.toEqual({
          statusCode: 503,
          body: {
            ready: false,
            failing: ["discord", "telegram"],
            uptimeMs: 8_000,
          },
        });

        currentAuth = {
          ...AUTH_TOKEN,
          token: "rotated-token",
        };

        await expect(sendReady("Bearer test-token")).resolves.toEqual({
          statusCode: 503,
          body: { ready: false },
        });
        await expect(sendReady("Bearer rotated-token")).resolves.toEqual({
          statusCode: 503,
          body: {
            ready: false,
            failing: ["discord", "telegram"],
            uptimeMs: 8_000,
          },
        });
      },
    });
  });

  it("hides readiness details when trusted-proxy auth violates browser origin policy", async () => {
    const getReadiness: ReadinessChecker = () => ({
      ready: false,
      failing: ["discord", "telegram"],
      uptimeMs: 8_000,
    });

    await withTempConfig({
      prefix: "probe-remote-origin-rejected",
      cfg: {
        gateway: {
          trustedProxies: ["10.0.0.1"],
          controlUi: {
            allowedOrigins: ["https://control.example"],
          },
        },
      },
      run: async () => {
        await withGatewayServer({
          prefix: "probe-remote-origin-rejected-server",
          resolvedAuth: {
            mode: "trusted-proxy",
            allowTailscale: false,
            trustedProxy: { userHeader: "x-forwarded-user" },
          },
          overrides: {
            getReadiness,
          },
          run: async (server) => {
            const req = createRequest({
              path: "/ready",
              remoteAddress: "10.0.0.1",
              host: "gateway.test",
              headers: {
                origin: "https://evil.example",
                forwarded: "for=203.0.113.10;proto=https;host=gateway.test",
                "x-forwarded-user": "user@example.com",
                "x-forwarded-proto": "https",
              },
            });
            const { res, getBody } = createResponse();
            await dispatchRequest(server, req, res);

            expect(res.statusCode).toBe(503);
            expect(JSON.parse(getBody())).toEqual({ ready: false });
          },
        });
      },
    });
  });

  it("returns typed internal error payload when readiness evaluation throws", async () => {
    const getReadiness: ReadinessChecker = () => {
      throw new Error("boom");
    };

    await withGatewayServer({
      prefix: "probe-throws",
      resolvedAuth: AUTH_NONE,
      overrides: { getReadiness },
      run: async (server) => {
        const req = createRequest({ path: "/ready" });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(503);
        expect(JSON.parse(getBody())).toEqual({ ready: false, failing: ["internal"], uptimeMs: 0 });
      },
    });
  });

  it("keeps /healthz shallow even when readiness checker reports failing channels", async () => {
    const getReadiness: ReadinessChecker = () => ({
      ready: false,
      failing: ["discord"],
      uptimeMs: 999,
    });

    await withGatewayServer({
      prefix: "probe-healthz-unaffected",
      resolvedAuth: AUTH_NONE,
      overrides: { getReadiness },
      run: async (server) => {
        const req = createRequest({ path: "/healthz" });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(200);
        expect(getBody()).toBe(JSON.stringify({ ok: true, status: "live" }));
      },
    });
  });

  it("reflects readiness status on HEAD /readyz without a response body", async () => {
    const getReadiness: ReadinessChecker = () => ({
      ready: false,
      failing: ["discord"],
      uptimeMs: 5_000,
    });

    await withGatewayServer({
      prefix: "probe-readyz-head",
      resolvedAuth: AUTH_NONE,
      overrides: { getReadiness },
      run: async (server) => {
        const req = createRequest({ path: "/readyz", method: "HEAD" });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(503);
        expect(getBody()).toBe("");
      },
    });
  });

  it("returns the full health snapshot for loopback /health/details requests", async () => {
    const snapshot = createHealthFixture({
      ts: 1_714_000_000_000,
      durationMs: 42,
      defaultAgentId: "main",
      sessions: {
        path: "/tmp/sessions",
        count: 3,
        recent: [{ key: "main:abc", updatedAt: 1_714_000_000_000, age: 1000 }],
      },
    });

    await withGatewayServer({
      prefix: "probe-health-details-loopback",
      resolvedAuth: AUTH_NONE,
      overrides: { getHealthCache: () => snapshot },
      run: async (server) => {
        const req = createRequest({ path: "/health/details" });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(getBody());
        expect(body.ok).toBe(true);
        expect(body.durationMs).toBe(42);
        expect(body.sessions.count).toBe(3);
        expect(body.uptime).toMatchObject({
          ms: expect.any(Number),
          human: expect.any(String),
        });
        expect(body.gateway).toMatchObject({
          version: expect.any(String),
          platform: process.platform,
          node: process.version,
        });
        expect(body.auditLog).toEqual({
          path: null,
          enabled: false,
        });
      },
    });
  });

  it("rejects non-loopback /health/details requests with 403", async () => {
    const snapshot = createHealthFixture();

    await withGatewayServer({
      prefix: "probe-health-details-remote",
      resolvedAuth: AUTH_TOKEN,
      overrides: { getHealthCache: () => snapshot },
      run: async (server) => {
        const req = createRequest({
          path: "/health/details",
          remoteAddress: "10.0.0.8",
          host: "gateway.test",
          authorization: "Bearer test-token",
        });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(403);
        expect(JSON.parse(getBody())).toEqual({ ok: false, error: "localhost only" });
      },
    });
  });

  it("returns 503 for /health/details before the first health snapshot is cached", async () => {
    await withGatewayServer({
      prefix: "probe-health-details-empty",
      resolvedAuth: AUTH_NONE,
      overrides: { getHealthCache: () => null },
      run: async (server) => {
        const req = createRequest({ path: "/health/details" });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(503);
        expect(JSON.parse(getBody())).toEqual({
          ok: false,
          error: "health snapshot not yet available",
        });
      },
    });
  });

  it("returns 503 for /health/details when no health cache provider is wired up", async () => {
    await withGatewayServer({
      prefix: "probe-health-details-unwired",
      resolvedAuth: AUTH_NONE,
      run: async (server) => {
        const req = createRequest({ path: "/health/details" });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(503);
        expect(JSON.parse(getBody())).toEqual({ ok: false, error: "health unavailable" });
      },
    });
  });

  it("serves Prometheus text on loopback GET /metrics", async () => {
    await withGatewayServer({
      prefix: "probe-metrics-loopback",
      resolvedAuth: AUTH_NONE,
      run: async (server) => {
        const req = createRequest({ path: "/metrics" });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(200);
        const text = getBody();
        expect(text).toContain("# HELP openclaw_gateway_info");
        expect(text).toContain("openclaw_gateway_uptime_seconds");
        expect(text).toContain("openclaw_process_memory_bytes{type=\"rss\"}");
      },
    });
  });

  it("rejects non-loopback GET /metrics with 403 JSON", async () => {
    await withGatewayServer({
      prefix: "probe-metrics-remote",
      resolvedAuth: AUTH_TOKEN,
      run: async (server) => {
        const req = createRequest({
          path: "/metrics",
          remoteAddress: "10.0.0.8",
          host: "gateway.test",
          authorization: "Bearer test-token",
        });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(403);
        expect(JSON.parse(getBody())).toEqual({ ok: false, error: "localhost only" });
      },
    });
  });

  it("returns no body for HEAD /metrics on loopback", async () => {
    await withGatewayServer({
      prefix: "probe-metrics-head-loopback",
      resolvedAuth: AUTH_NONE,
      run: async (server) => {
        const req = createRequest({ path: "/metrics", method: "HEAD" });
        const { res, getBody } = createResponse();
        await dispatchRequest(server, req, res);

        expect(res.statusCode).toBe(200);
        expect(getBody()).toBe("");
      },
    });
  });
});
