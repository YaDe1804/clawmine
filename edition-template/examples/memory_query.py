"""
Memory subsystem status via Gateway (`doctor.memory.status`).

Semantic memory search is typically driven through agent tools; this RPC
reports embedding/search manager availability for the default agent.
"""

from __future__ import annotations

import asyncio
import json
import sys

from openclaw_edition.client import GatewayClient
from openclaw_edition.config import GatewayConfig


async def main() -> None:
    query = " ".join(sys.argv[1:]).strip()

    config = GatewayConfig.from_env()
    client = GatewayClient(config)
    await client.connect()

    print("doctor.memory.status")
    if query:
        print(f"(CLI hint: {query!r} — RPC itself takes no query filter)\n")
    else:
        print()
    results = await client.doctor_memory_status()
    print(json.dumps(results, indent=2, ensure_ascii=False))

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
