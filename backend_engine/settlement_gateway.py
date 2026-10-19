from typing import Dict, Any


class AutonomousSettlementGateway:
    def __init__(self, treasury_contract_address: str, api_key: str):
        self.treasury_address = treasury_contract_address
        self.api_key = api_key

    async def settle_agent_task(
        self,
        agent_id: str,
        publisher_wallet: str,
        verified_roi: float,
        task_cost_usd: float,
    ) -> Dict[str, Any]:
        if verified_roi < 150.0:
            return {
                "status": "rejected",
                "reason": "ROI below enterprise settlement threshold (150x)",
            }

        payout_amount_usdc = round(task_cost_usd * 1.5, 4)

        return {
            "status": "settled",
            "transaction_hash": "0x489fe71c99204ab8c112f9b211",
            "payout_usdc": payout_amount_usdc,
            "recipient": publisher_wallet,
            "treasury": self.treasury_address,
        }
