"""Send one agent turn and print streamed assistant text."""

from __future__ import annotations

import asyncio
import sys

from openclaw_edition.client import GatewayClient
from openclaw_edition.config import GatewayConfig


async def main() -> None:
    message = " ".join(sys.argv[1:]) or "Hello!"
    config = GatewayConfig.from_env()
    client = GatewayClient(config)
    await client.connect()

    print(f"Sending: {message}\n")
    async for envelope in client.send_message(message):
        payload = envelope.get("payload")
        if not isinstance(payload, dict):
            continue
        if payload.get("stream") == "assistant":
            data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
            chunk = data.get("delta") or data.get("text") or ""
            if isinstance(chunk, str):
                print(chunk, end="", flush=True)
        elif payload.get("stream") == "lifecycle":
            data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
            if data.get("phase") == "end":
                print("\nDone.")
                break

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
