---
title: "Architecture Overview"
summary: "OpenClaw system architecture — local AI gateway + RAG backend"
read_when:
  - You want to understand how OpenClaw is structured
  - You are adding a new component or integration
  - You are debugging gateway, memory, or provider issues
---

# Architecture Overview

## Vision

OpenClaw is a **local AI gateway and memory/RAG backend**.
It runs entirely on-premise — no cloud dependencies, no external
API calls by default. All inference runs through local providers
(Ollama, LM Studio, vLLM, ComfyUI). Messaging is handled by
AntarBridge (in development).

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client Layer                       │
│   Control UI (Browser)  ·  CLI  ·  AntarBridge*     │
└─────────────────┬───────────────────────────────────┘
                  │ WebSocket (ws://127.0.0.1:18789)
┌─────────────────▼───────────────────────────────────┐
│                 OpenClaw Gateway                     │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Auth Layer │  │ Agent Runtime│  │  HTTP API  │ │
│  │  Rate Limit │  │  Agent Loop  │  │  Control UI│ │
│  │  CSP / HSTS │  │  Tool Engine │  │  /health   │ │
│  └─────────────┘  └──────┬───────┘  └────────────┘ │
│                           │                          │
│  ┌────────────────────────▼──────────────────────┐  │
│  │              Memory / RAG Layer                │  │
│  │  memory-core  ·  memory-lancedb  ·  active-memory│
│  │  LanceDB (local)  ·  bge-m3 via Ollama         │  │
│  └────────────────────────┬──────────────────────┘  │
└───────────────────────────┼─────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────┐
│              Local Provider Layer                    │
│  Ollama  ·  LM Studio  ·  vLLM  ·  ComfyUI  ·  NIM │
└─────────────────────────────────────────────────────┘

* AntarBridge in development
```

## Components

### Gateway

The Gateway is the central process. It owns:

- **WebSocket server** — all clients connect here
  (default `127.0.0.1:18789`)
- **HTTP server** — Control UI, `/health`, canvas host
- **Auth + Rate Limiting** — sliding window, IP-based lockout,
  device pairing, shared-secret auth
- **Security Headers** — CSP (hash-based), HSTS, X-Frame-Options,
  Referrer-Policy, Permissions-Policy
- **Agent Runtime** — executes the agent loop, manages sessions,
  streams events

Start: `openclaw gateway`

### Agent Runtime

The agent runtime serializes runs per-session via a queue.
Each run:

1. Validates params, resolves session
2. Loads skills snapshot + bootstrap files
3. Resolves model + auth profile
4. Runs the embedded pi-agent-core loop
5. Streams lifecycle/tool/assistant events to clients
6. Persists session metadata

Bootstrap files (in `~/.openclaw/workspace/`):
- `AGENTS.md` — operating instructions
- `SOUL.md` — persona and tone
- `MEMORY.md` — long-term memory (written by agent)
- `USER.md` — user profile
- `IDENTITY.md` — agent name and identity

### Memory / RAG Layer

Three components work together:

| Component | Role |
|-----------|------|
| `memory-core` | Session history search, FTS |
| `memory-lancedb` | Vector store, semantic search via LanceDB |
| `active-memory` | Auto-recall at session start, auto-capture |

**Embedding:** Ollama → bge-m3 (local, offline, multilingual DE+EN)
**Storage:** `~/.openclaw/memory/lancedb/` (LanceDB vector files)
**Long-term memory:** `~/.openclaw/workspace/MEMORY.md`

When the agent receives a message, active-memory queries
LanceDB for relevant past context and injects it automatically.

### Local Provider Layer

All inference runs locally. No cloud API calls.

| Provider | Use |
|----------|-----|
| Ollama | Text models + embeddings (bge-m3) |
| LM Studio | Alternative local inference |
| vLLM | High-throughput local inference |
| ComfyUI | Image generation (installed) |
| NVIDIA NIM | RTX-accelerated inference |
| LiteLLM | Local proxy / model routing |

### Plugin SDK

Extensions live under `extensions/`. Each extension is a
TypeScript package that implements one or more plugin contracts:

- **Channel** — messaging surface (AntarBridge when ready)
- **Provider** — AI model backend
- **Memory** — storage backend
- **Tool** — agent capability

Active extensions: see `pnpm-workspace.yaml`

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Transport | TLS optional, HSTS default-on |
| Auth | Shared secret + device pairing + sliding-window rate limit |
| CSP | Hash-based (script + style), no unsafe-inline |
| Input | Prompt injection detection (15+ patterns), Zod validation |
| Supply Chain | SHA-pinned GitHub Actions, Zizmor gates, detect-secrets CI |
| Runtime | Non-root Docker (USER node), multi-stage build |
| Logging | Structured logs, no silent catch(), unhandledRejection handler |

Full security audit: `docs/sequ/SEQU-Initial.md`
Decisions: `docs/adr/`

## Data Flow — Chat Message

```
User message
    │
    ▼
AntarBridge (future) / Control UI
    │ WebSocket req:agent
    ▼
Gateway Auth + Rate Limit
    │
    ▼
Agent Runtime — queue + serialize
    │
    ├── active-memory: query LanceDB for context
    │       │ Ollama /v1/embeddings (bge-m3)
    │       └── inject relevant memories
    │
    ├── Load MEMORY.md + daily notes
    │
    ▼
pi-agent-core loop
    │
    ├── Model inference (Ollama / LM Studio / vLLM)
    │
    ├── Tool calls (fs, exec, memory_search, etc.)
    │
    └── Stream assistant deltas
    │
    ▼
active-memory: capture + store to LanceDB
    │
    ▼
Response → client
```

## Directory Structure

```
openclaw-main/
├── src/                    # Gateway core, CLI, agent runtime
│   ├── gateway/            # HTTP + WebSocket server, auth, CSP
│   ├── security/           # Injection detection, safe-regex, audit
│   ├── infra/              # FS utilities, process management
│   ├── config/             # Config types, Zod schemas
│   └── cli/                # CLI commands
├── extensions/             # Plugin extensions
│   ├── memory-lancedb/     # Vector memory backend
│   ├── memory-core/        # Session memory + FTS
│   ├── active-memory/      # Auto-recall + capture
│   ├── ollama/             # Ollama provider
│   ├── lmstudio/           # LM Studio provider
│   ├── comfy/              # ComfyUI image generation
│   ├── vllm/               # vLLM provider
│   ├── nvidia/             # NVIDIA NIM provider
│   └── ...                 # Other extensions
├── packages/               # Shared packages
│   ├── plugin-sdk/         # Plugin development SDK
│   └── memory-host-sdk/    # Memory host interface
├── docs/                   # Documentation (Mintlify)
│   ├── architecture/       # This document + diagrams
│   ├── adr/                # Architecture Decision Records
│   ├── sequ/               # Security & Quality audits
│   └── roadmap/            # Project roadmap
├── .github/workflows/      # CI/CD (SHA-pinned)
├── apps/android/           # Android client (future)
├── Dockerfile              # Production image
└── openclaw.json           # User config (~/.openclaw/)
```

## Related Documents

- [ADR Index](../adr/) — architectural decisions
- [SEQU-Initial](../sequ/SEQU-Initial.md) — security audit
- [Roadmap](../roadmap/openclaw_roadmap_v3.html) — project status
- [Gateway Protocol](../gateway/protocol.md) — WebSocket API
- [Memory](../concepts/memory.md) — memory system details
- [Agent Loop](../concepts/agent-loop.md) — agent execution
