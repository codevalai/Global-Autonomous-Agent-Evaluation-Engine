import asyncpg


class TimescaleAuditLedger:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool = None

    async def connect(self):
        self.pool = await asyncpg.create_pool(dsn=self.dsn)
        await self._initialize_tables()

    async def _initialize_tables(self):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS agent_eval_history (
                    time TIMESTAMPTZ NOT NULL,
                    agent_id TEXT NOT NULL,
                    tier TEXT NOT NULL,
                    composite_score DOUBLE PRECISION,
                    trajectory_success DOUBLE PRECISION,
                    cost_per_task_usd DOUBLE PRECISION,
                    roi_factor DOUBLE PRECISION,
                    resource_waste_index DOUBLE PRECISION
                );
                SELECT create_hypertable('agent_eval_history', 'time', if_not_exists => TRUE);
            """
            )

    async def log_evaluation(self, eval_result: dict):
        async with self.pool.acquire() as conn:
            fin = eval_result["financial_evaluation"]
            met = eval_result["metrics"]
            await conn.execute(
                """
                INSERT INTO agent_eval_history 
                (time, agent_id, tier, composite_score, trajectory_success, cost_per_task_usd, roi_factor, resource_waste_index)
                VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7)
            """,
                eval_result["agent_id"],
                eval_result["tier"],
                eval_result["composite_score"],
                met["trajectory_success"],
                fin["cost_per_task_usd"],
                fin["estimated_roi_factor"],
                fin["resource_waste_index"],
            )
