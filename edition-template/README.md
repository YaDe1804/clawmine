# OpenClaw Edition Template

Minimal Python template for **OpenClaw Editions**. Each edition talks to a running **OpenClaw Core** over the documented **Gateway API** (WebSocket + HTTP) — no imports from Core internals.

The wire format matches the Gateway’s `req` / `res` / `event` frames (protocol version **3**). See `docs/gateway/protocol.md` in the Core repo and [ADR-007 — Edition architecture](../docs/adr/ADR-007-edition-architecture.md).

## Prerequisites

- Python 3.11+
- OpenClaw Core listening locally (default port **18789**)
- Shared secret / token configured for Gateway auth (`OPENCLAW_TOKEN`)

## Setup

```bash
cp .env.example .env
# Edit .env (token from your Gateway auth config)

python -m venv .venv
.venv\Scripts\activate
# source .venv/bin/activate   # Unix-like shells

pip install -e ".[dev]"
```

## Run the template

```bash
python -m openclaw_edition.main
```

## Examples

```bash
python examples/health_check.py
python examples/send_message.py "What do you know about me?"
python examples/memory_query.py "Pentest Targets"
```

`memory_query.py` calls **`doctor.memory.status`** (embedding / memory manager probe). Interactive semantic recall is normally done through **agent tools**, not a dedicated Gateway RPC in this template.

## Developing your own edition

1. Copy `edition-template/` or publish it as a standalone repo later.
2. Set `OPENCLAW_EDITION_NAME` (shown as `displayName` on connect).
3. Implement orchestration in `openclaw_edition/main.py` and add modules under `openclaw_edition/`.
4. Keep **`client.id` = `gateway-client`** and **`client.mode` = `backend`** so loopback token auth can skip device pairing (same rules as Core’s handshake).

## Verification

```bash
cd edition-template
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"

ruff check openclaw_edition/
ruff check examples/

# Requires Core running:
python examples/health_check.py
```
