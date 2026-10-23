---
title: "Gateway Architecture"
summary: "OpenClaw Gateway — components, protocol, security"
read_when:
  - Working on gateway protocol, clients, or transports
  - Adding a new channel or provider
---

# Gateway Architecture

> Full system overview: [Architecture Overview](/architecture/overview)

## Overview

OpenClaw Gateway is a single long-lived process that:

- Owns all AI provider connections (local only)
- Exposes a typed WebSocket API for clients
- Serves the Control UI over HTTP
- Manages device pairing and auth
- Runs the agent runtime

**No cloud connections by default.**
All providers run locally (Ollama, LM Studio, vLLM, ComfyUI).
Messaging via AntarBridge (in development).

## Bind address

Default: `127.0.0.1:18789`

Control UI: `http://127.0.0.1:18789/__openclaw__/`
Canvas host: `http://127.0.0.1:18789/__openclaw__/canvas/`

## Components

- **Auth + Rate Limiting** — sliding window, IP lockout,
  device pairing, shared-secret, device tokens
- **Security Headers** — CSP hash-based, HSTS default-on,
  X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Agent Runtime** — serialized per-session agent loops
- **Memory Layer** — LanceDB + active-memory auto-recall
- **Plugin Registry** — loads extensions from extensions/

## Wire Protocol

Transport: WebSocket, text frames, JSON payloads.

First frame must be `connect`:
```json
{
  "type": "req",
  "id": "1",
  "method": "connect",
  "params": {
    "auth": { "token": "<shared-secret>" },
    "device": { "id": "<uuid>", "platform": "cli" }
  }
}
```

Requests: `{ type: "req", id, method, params }`
Responses: `{ type: "res", id, ok, payload|error }`
Events: `{ type: "event", event, payload, seq? }`

## Security

See [Security](../gateway/security/index.md) and
[SEQU-Initial](../sequ/SEQU-Initial.md) for full details.

Key properties:
- CSP: no unsafe-inline, hash-based for scripts + styles
- HSTS: max-age=63072000; includeSubDomains (TLS only)
- Rate limit: 10 attempts / 60s window / 5min lockout
- Prompt injection: 15+ patterns, cryptographic boundary markers

## Operations

Start: `openclaw gateway`
Health: `GET /health` or `req:health` over WebSocket
Logs: structured JSON to stdout
