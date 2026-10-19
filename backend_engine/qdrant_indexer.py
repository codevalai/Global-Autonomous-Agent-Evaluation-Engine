from qdrant_client import QdrantClient
from qdrant_client.http import models


class SemanticAgentIndexer:
    def __init__(self, qdrant_host: str = "localhost"):
        self.client = QdrantClient(host=qdrant_host, port=6333)
        self.collection_name = "global_agent_semantics"
        self._ensure_collection()

    def _ensure_collection(self):
        collections = [c.name for c in self.client.get_collections().collections]
        if self.collection_name not in collections:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=1536, distance=models.Distance.COSINE
                ),
            )

    async def index_agent_capabilities(
        self, eval_result: dict, embedding_vector: list, text_description: str
    ):
        self.client.upsert(
            collection_name=self.collection_name,
            points=[
                models.PointStruct(
                    id=eval_result["agent_id"],
                    vector=embedding_vector,
                    payload={
                        "tier": eval_result["tier"],
                        "composite_score": eval_result["composite_score"],
                        "cost_per_task_usd": eval_result["financial_evaluation"][
                            "cost_per_task_usd"
                        ],
                        "description": text_description,
                    },
                )
            ],
        )

    def search_similar_agents(
        self,
        query_vector: list,
        max_cost: float,
        tier: str = None,
        limit: int = 10,
    ):
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="cost_per_task_usd", range=models.Range(lte=max_cost)
                )
            ]
        )
        if tier:
            query_filter.must.append(
                models.FieldCondition(
                    key="tier", match=models.MatchValue(value=tier)
                )
            )

        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            query_filter=query_filter,
            limit=limit,
        )
        return results.points
