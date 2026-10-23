"""
OpenClaw Gateway client — WebSocket + HTTP.

Aligned with the Gateway wire format (`type: req|res|event`). Edition-specific
behavior belongs in `main.py` or separate modules — extend this client rather
than editing Core.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import AsyncIterator, Mapping
from typing import Any

import httpx
import websockets

from . import __version__
from .config import GATEWAY_PROTOCOL_VERSION, GatewayConfig


def _rpc_error_message(error: Any) -> str:
    if isinstance(error, Mapping):
        msg = error.get("message")
        if isinstance(msg, str) and msg.strip():
            return msg
        code = error.get("code")
        if code is not None:
            return str(code)
        return json.dumps(error, ensure_ascii=False)
    return str(error)


class GatewayClient:
    def __init__(self, config: GatewayConfig):
        self.config = config
        self._ws: websockets.ClientConnection | None = None
        self._pending: dict[str, asyncio.Future[Any]] = {}
        self._recv_task: asyncio.Task[None] | None = None
        self._agent_queues: dict[str, asyncio.Queue[dict[str, Any]]] = {}

    # --- HTTP ---

    async def health(self) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{self.config.http_url}/health", timeout=5.0)
            r.raise_for_status()
            return r.json()

    async def health_details(self) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{self.config.http_url}/health/details",
                timeout=10.0,
            )
            r.raise_for_status()
            return r.json()

    async def metrics(self) -> str:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{self.config.http_url}/metrics", timeout=5.0)
            r.raise_for_status()
            return r.text

    # --- WebSocket lifecycle ---

    async def connect(self) -> dict[str, Any]:
        """Open WebSocket, run receiver, complete `connect` RPC (hello-ok payload)."""
        self._ws = await websockets.connect(self.config.ws_url)
        loop = asyncio.get_running_loop()
        self._recv_task = loop.create_task(self._receive_loop())
        await asyncio.sleep(0)
        return await self._handshake_connect()

    async def disconnect(self) -> None:
        if self._recv_task:
            self._recv_task.cancel()
            try:
                await self._recv_task
            except asyncio.CancelledError:
                pass
            self._recv_task = None
        self._agent_queues.clear()
        self._pending.clear()
        if self._ws:
            await self._ws.close()
            self._ws = None

    async def rpc(self, method: str, params: dict[str, Any]) -> Any:
        """Generic JSON-RPC-style call over the Gateway WebSocket."""
        return await self._send_request(method, params)

    async def send_message(
        self,
        text: str,
        *,
        session_key: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Run `agent` and yield raw Gateway agent events for this run.

        Each yielded value matches the WebSocket envelope shape:
        ``{"type": "event", "event": "agent", "payload": {...}}``.
        """
        sid = session_key if session_key is not None else self.config.session_key
        idempotency_key = str(uuid.uuid4())
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        accepted = await self.rpc(
            "agent",
            {
                "message": text,
                "sessionKey": sid,
                "idempotencyKey": idempotency_key,
            },
        )
        if not isinstance(accepted, Mapping):
            raise RuntimeError(f"unexpected agent response: {accepted!r}")
        run_id_raw = accepted.get("runId")
        if not isinstance(run_id_raw, str) or not run_id_raw.strip():
            raise RuntimeError(f"agent accepted payload missing runId: {accepted!r}")
        run_id = run_id_raw.strip()
        self._agent_queues[run_id] = queue
        try:
            while True:
                evt = await asyncio.wait_for(queue.get(), timeout=600.0)
                yield evt
                payload = evt.get("payload")
                if not isinstance(payload, Mapping):
                    continue
                stream = payload.get("stream")
                data = payload.get("data") if isinstance(payload.get("data"), Mapping) else {}
                if stream == "lifecycle" and data.get("phase") == "end":
                    break
                if stream == "error":
                    break
        finally:
            self._agent_queues.pop(run_id, None)

    async def doctor_memory_status(self) -> Any:
        """Gateway probe for memory / embedding availability (`doctor.memory.status`)."""
        return await self.rpc("doctor.memory.status", {})

    async def get_sessions(self) -> Any:
        return await self.rpc("sessions.list", {})

    # --- Internal ---

    async def _handshake_connect(self) -> dict[str, Any]:
        params = {
            "minProtocol": GATEWAY_PROTOCOL_VERSION,
            "maxProtocol": GATEWAY_PROTOCOL_VERSION,
            "role": "operator",
            "scopes": ["operator.admin"],
            "client": {
                "id": "gateway-client",
                "displayName": self.config.edition_name,
                "version": __version__,
                "platform": "python",
                "mode": "backend",
            },
            "auth": {"token": self.config.token},
        }
        hello = await self._send_request("connect", params)
        if isinstance(hello, Mapping):
            return dict(hello)
        return {"payload": hello}

    async def _send_request(self, method: str, params: dict[str, Any]) -> Any:
        if not self._ws:
            raise RuntimeError("WebSocket is not connected")
        loop = asyncio.get_running_loop()
        req_id = str(uuid.uuid4())
        fut: asyncio.Future[Any] = loop.create_future()
        self._pending[req_id] = fut
        await self._ws.send(
            json.dumps(
                {
                    "type": "req",
                    "id": req_id,
                    "method": method,
                    "params": params,
                },
            ),
        )
        return await asyncio.wait_for(fut, timeout=120.0)

    async def _receive_loop(self) -> None:
        assert self._ws is not None
        try:
            async for raw in self._ws:
                msg = json.loads(raw)
                mtype = msg.get("type")

                if mtype == "res":
                    rid = msg.get("id")
                    fut = self._pending.pop(str(rid), None) if rid is not None else None
                    if fut and not fut.done():
                        if msg.get("ok"):
                            fut.set_result(msg.get("payload"))
                        else:
                            fut.set_exception(
                                RuntimeError(_rpc_error_message(msg.get("error"))),
                            )
                    continue

                if mtype == "event" and msg.get("event") == "agent":
                    payload = msg.get("payload")
                    if isinstance(payload, Mapping):
                        run_id = payload.get("runId")
                        if isinstance(run_id, str):
                            q = self._agent_queues.get(run_id)
                            if q is not None:
                                await q.put(msg)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            for rid, fut in list(self._pending.items()):
                if not fut.done():
                    fut.set_exception(exc)
            self._pending.clear()
