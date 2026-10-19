import asyncio
import json
import logging
from kafka import KafkaProducer
import httpx
import redis.asyncio as redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GAEE-Ingestion")


class GlobalAgentIngestionCluster:
    """
    Distributed 5-second web scraper mesh for /.well-known/agent-manifest.json
    and Agentic Resource Discovery (ARD) registries.
    """

    def __init__(self, kafka_bootstrap_servers: list, redis_host: str):
        self.producer = KafkaProducer(
            bootstrap_servers=kafka_bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            acks="all",
            retries=3,
        )
        self.redis_client = redis.Redis(host=redis_host, port=6379, db=0)
        self.crawl_interval = 5  # 5-second strict global polling cadence

    async def scan_target_node(self, endpoint_url: str):
        lock_acquired = await self.redis_client.set(
            f"lock:crawl:{endpoint_url}",
            "active",
            ex=self.crawl_interval - 1,
            nx=True,
        )
        if not lock_acquired:
            return

        async with httpx.AsyncClient(timeout=2.5) as client:
            try:
                response = await client.get(
                    f"{endpoint_url}/.well-known/agent-manifest.json"
                )
                if response.status_code == 200:
                    manifest = response.json()
                    payload = {
                        "agent_id": manifest.get("id"),
                        "tier": manifest.get("tier", "AI"),
                        "endpoint": endpoint_url,
                        "capabilities": manifest.get("capabilities", []),
                        "discovered_at": asyncio.get_event_loop().time(),
                    }
                    self.producer.send("agent-raw-ingestion-stream", value=payload)
            except httpx.RequestError:
                logger.debug(f"Target unreachable or offline: {endpoint_url}")

    async def run_scheduler(self, target_registry: list):
        logger.info("Starting 5-Second Global Scraper Mesh...")
        while True:
            start_time = asyncio.get_event_loop().time()
            await asyncio.gather(
                *(self.scan_target_node(url) for url in target_registry)
            )
            elapsed = asyncio.get_event_loop().time() - start_time
            sleep_duration = max(0, self.crawl_interval - elapsed)
            await asyncio.sleep(sleep_duration)
