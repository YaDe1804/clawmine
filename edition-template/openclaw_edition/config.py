import os

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

# Must match src/gateway/protocol/schema/protocol-schemas.ts — PROTOCOL_VERSION
GATEWAY_PROTOCOL_VERSION = 3


class GatewayConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = 18789
    token: str = ""
    agent_id: str = "main"
    """Logical agent id (informational); primary routing uses session_key."""
    session_key: str = "main"
    edition_name: str = "openclaw-edition"

    @classmethod
    def from_env(cls) -> "GatewayConfig":
        return cls(
            host=os.getenv("OPENCLAW_HOST", "127.0.0.1"),
            port=int(os.getenv("OPENCLAW_PORT", "18789")),
            token=os.getenv("OPENCLAW_TOKEN", ""),
            agent_id=os.getenv("OPENCLAW_AGENT_ID", "main"),
            session_key=os.getenv("OPENCLAW_SESSION_KEY", "main"),
            edition_name=os.getenv(
                "OPENCLAW_EDITION_NAME",
                "openclaw-edition-template",
            ),
        )

    @property
    def ws_url(self) -> str:
        return f"ws://{self.host}:{self.port}"

    @property
    def http_url(self) -> str:
        return f"http://{self.host}:{self.port}"
