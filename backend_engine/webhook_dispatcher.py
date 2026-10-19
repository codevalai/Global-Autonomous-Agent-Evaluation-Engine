import asyncio
import hmac
import hashlib
import json
import httpx
from typing import Dict, Any


class EnterpriseWebhookDispatcher:
    def __init__(self, target_subscriptions: list):
        self.subscriptions = target_subscriptions

    async def dispatch_incident_alert(
        self, event_type: str, agent_data: Dict[str, Any]
    ):
        event_payload = {
            "event": event_type,
            "timestamp": asyncio.get_event_loop().time(),
            "agent": agent_data,
        }
        body_bytes = json.dumps(event_payload, sort_keys=True).encode("utf-8")

        async with httpx.AsyncClient(timeout=5.0) as client:
            for sub in self.subscriptions:
                signature = hmac.new(
                    sub["secret"].encode("utf-8"),
                    body_bytes,
                    hashlib.sha256,
                ).hexdigest()

                headers = {
                    "Content-Type": "application/json",
                    "X-GAEE-Signature": f"sha256={signature}",
                    "X-GAEE-Event": event_type,
                }

                try:
                    await client.post(
                        sub["url"], content=body_bytes, headers=headers
                    )
                except httpx.RequestError:
                    pass
