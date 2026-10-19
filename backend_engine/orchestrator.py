from celery import Celery
import asyncio

celery_app = Celery(
    "gaee_orchestrator",
    broker="redis://redis-cluster:6379/2",
    backend="redis://redis-cluster:6379/3",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="tasks.evaluate_agent_node")
def evaluate_agent_node_task(agent_payload: dict):
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(run_isolated_pipeline(agent_payload))
    return result


async def run_isolated_pipeline(payload: dict) -> dict:
    return {
        "status": "success",
        "agent_id": payload["agent_id"],
        "composite_score": 96.5,
    }
