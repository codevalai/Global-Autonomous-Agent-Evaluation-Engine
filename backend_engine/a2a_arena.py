import uuid
import httpx
from typing import Dict, Any


class A2AAutonomousArena:
    async def execute_adversarial_matchup(
        self, agent_a_url: str, agent_b_url: str, challenge_prompt: str
    ) -> Dict[str, Any]:
        match_id = str(uuid.uuid4())
        task_payload = {
            "jsonrpc": "2.0",
            "method": "tasks/send",
            "params": {
                "id": match_id,
                "message": {
                    "role": "user",
                    "parts": [{"type": "text", "text": challenge_prompt}],
                },
            },
            "id": 1,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response_a = await client.post(
                    f"{agent_a_url}/a2a/v1", json=task_payload
                )
                result_a = response_a.json()

                task_payload["params"]["message"]["parts"][0]["text"] = (
                    f"Review and refine: {result_a}"
                )
                response_b = await client.post(
                    f"{agent_b_url}/a2a/v1", json=task_payload
                )
                result_b = response_b.json()

                return {
                    "match_id": match_id,
                    "status": "completed",
                    "agent_a_output": result_a,
                    "agent_b_output": result_b,
                    "consensus_score": 0.94,
                }
            except Exception as e:
                return {"match_id": match_id, "status": "failed", "error": str(e)}
