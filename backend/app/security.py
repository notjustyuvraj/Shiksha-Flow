"""Password hashing (PBKDF2) and JWT tokens (HS256) using only the standard library."""
import os
import hmac
import json
import time
import base64
import hashlib
import secrets

from .database import BASE_DIR

TOKEN_TTL_SECONDS = 60 * 60 * 12  # 12 hours
PBKDF2_ROUNDS = 200_000


def _load_secret() -> str:
    env = os.environ.get("SHIKSHAFLOW_SECRET")
    if env:
        return env
    key_path = os.path.join(BASE_DIR, ".secret")
    if os.path.exists(key_path):
        with open(key_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    new_key = secrets.token_hex(32)
    with open(key_path, "w", encoding="utf-8") as f:
        f.write(new_key)
    return new_key


SECRET = _load_secret()


# ---- Passwords ----
def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PBKDF2_ROUNDS)
    return salt, dk.hex()


def verify_password(password: str, salt: str, hashed: str) -> bool:
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PBKDF2_ROUNDS)
    return hmac.compare_digest(dk.hex(), hashed)


# ---- JWT (HS256) ----
def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def create_token(user_id: int, role: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": user_id, "role": role, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    seg = _b64(json.dumps(header, separators=(",", ":")).encode()) + "." + \
        _b64(json.dumps(payload, separators=(",", ":")).encode())
    sig = _b64(hmac.new(SECRET.encode(), seg.encode(), hashlib.sha256).digest())
    return f"{seg}.{sig}"


def decode_token(token: str) -> dict | None:
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}"
        expected = _b64(hmac.new(SECRET.encode(), signing_input.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(expected, sig_b64):
            return None
        payload = json.loads(_unb64(payload_b64))
        if int(payload.get("exp", 0)) < time.time():
            return None
        return payload
    except Exception:
        return None
