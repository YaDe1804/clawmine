"""
Edition entry point — put edition-specific orchestration here.

This template demonstrates HTTP health, WebSocket connect, and one `agent`
turn with streaming assistant output.
"""

from __future__ import annotations

import asyncio

from rich.console import Console

from .client import GatewayClient
from .config import GatewayConfig

console = Console()


async def run() -> None:
    config = GatewayConfig.from_env()
    client = GatewayClient(config)

    console.print("[bold green]Connecting to OpenClaw Core[/]")
    console.print(f"  Gateway: {config.ws_url}")
    console.print(f"  Edition: {config.edition_name}")
    console.print(f"  Session: {config.session_key}")

    health = await client.health()
    if not health.get("ok"):
        console.print("[red]Gateway not reachable[/]")
        return

    console.print("[green]Gateway OK[/]")

    await client.connect()
    console.print("[green]WebSocket connected (hello-ok)[/]")

    console.print("\n[bold]Sending message…[/]")
    async for envelope in client.send_message(
        "Hello from OpenClaw Edition Template!",
    ):
        payload = envelope.get("payload")
        if not isinstance(payload, dict):
            continue
        stream = payload.get("stream")
        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        if stream == "assistant":
            chunk = data.get("delta") or data.get("text") or ""
            if isinstance(chunk, str) and chunk:
                console.print(chunk, end="")
        elif stream == "lifecycle" and data.get("phase") == "end":
            console.print("\n[green]Done.[/]")
            break
        elif stream == "error":
            console.print(f"\n[red]Agent stream error: {data}[/]")
            break

    await client.disconnect()


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
