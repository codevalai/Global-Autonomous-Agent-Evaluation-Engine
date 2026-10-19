import asyncio
import json
from typing import Callable, Any


class P2PGossipMeshDiscovery:
    """
    Decentralized Libp2p Kademlia Distributed Hash Table (DHT) & GossipSub discovery mesh.
    Replaces centralized HTTP polling bottlenecks with zero-latency P2P manifest propagation.
    """

    def __init__(self, listen_port: int = 4001):
        self.listen_port = listen_port
        self.node = None
        self.dht = None
        self.topic = "gaee:agent-announcements:v1"

    async def initialize_mesh_node(self, new_node_factory: Callable, dht_cls: Any):
        self.node = await new_node_factory(port_listen=self.listen_port)
        self.dht = dht_cls(self.node)
        await self.dht.start()

    async def listen_for_agent_gossip_topics(self, callback_func: Callable):
        pubsub = self.node.get_pubsub()
        await pubsub.subscribe(self.topic)

        while True:
            msg = await pubsub.next()
            agent_manifest = json.loads(msg.data.decode("utf-8"))
            asyncio.create_task(callback_func(agent_manifest))
