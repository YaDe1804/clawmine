"""Minimal HTTP health probe against a running Gateway."""

from __future__ import annotations

import asyncio
import json
import os

import httpx


async def main() -> None:
    host = os.getenv("OPENCLAW_HOST", "127.0.0.1")
    port = int(os.getenv("OPENCLAW_PORT", "18789"))
    base = f"http://{host}:{port}"
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{base}/health")
        r.raise_for_status()
        print("Health:", r.json())

        r2 = await client.get(f"{base}/health/details")
        r2.raise_for_status()
        print("Details:", json.dumps(r2.json(), indent=2))


if __name__ == "__main__":
    asyncio.run(main())
