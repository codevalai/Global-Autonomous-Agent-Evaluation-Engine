import redis.asyncio as redis


class TopOneMillionLeaderboardManager:
    def __init__(self, redis_cluster_host: str):
        self.redis = redis.Redis(host=redis_cluster_host, port=6379, db=1)
        self.max_leaderboard_size = 1_000_000

    async def process_evaluation_output(self, eval_result: dict):
        agent_id = eval_result["agent_id"]
        tier = eval_result["tier"].lower()
        score = eval_result["composite_score"]

        async with self.redis.pipeline() as pipe:
            pipe.zadd("global:directory:top_1m", {agent_id: score})
            pipe.zadd(f"tier:{tier}:directory", {agent_id: score})
            pipe.zremrangebyrank(
                "global:directory:top_1m", 0, -self.max_leaderboard_size - 1
            )
            pipe.zremrangebyrank(f"tier:{tier}:directory", 0, -500_000 - 1)
            await pipe.execute()

    async def get_agent_global_rank(self, agent_id: str) -> int:
        rank = await self.redis.zrevrank("global:directory:top_1m", agent_id)
        return rank + 1 if rank is not None else None
