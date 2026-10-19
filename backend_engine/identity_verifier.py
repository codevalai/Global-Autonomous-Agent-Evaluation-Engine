import base64
import json
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.exceptions import InvalidSignature


class AgentIdentityVerifier:
    @staticmethod
    def verify_manifest_signature(manifest: dict, public_key_pem_bytes: bytes) -> bool:
        """
        Verifies that the agent manifest was cryptographically signed by the
        domain holder using Ed25519, preventing identity spoofing and metric inflation.
        """
        try:
            public_key = ed25519.Ed25519PublicKey.from_public_bytes(
                public_key_pem_bytes
            )
            manifest_copy = dict(manifest)
            signature_b64 = manifest_copy.pop("signature", None)
            if not signature_b64:
                return False

            signature = base64.b64decode(signature_b64)
            canonical_data = json.dumps(manifest_copy, sort_keys=True).encode("utf-8")

            public_key.verify(signature, canonical_data)
            return True
        except (InvalidSignature, Exception):
            return False
