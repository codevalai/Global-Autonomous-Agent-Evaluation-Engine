import hashlib
from typing import List, Tuple


class MerkleLeaderboardBridge:
    @staticmethod
    def _hash_leaf(agent_id: str, score: float) -> bytes:
        raw = f"{agent_id}:{score}".encode("utf-8")
        return hashlib.sha256(raw).digest()

    @staticmethod
    def generate_merkle_root(leaderboard_entries: List[Tuple[str, float]]) -> str:
        if not leaderboard_entries:
            return hashlib.sha256(b"empty").hexdigest()

        current_level = [
            MerkleLeaderboardBridge._hash_leaf(aid, score)
            for aid, score in leaderboard_entries
        ]

        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                right = (
                    current_level[i + 1] if i + 1 < len(current_level) else left
                )
                combined = left + right
                next_level.append(hashlib.sha256(combined).digest())
            current_level = next_level

        return current_level[0].hex()
