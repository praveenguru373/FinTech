import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    try:
        return password_hash.verify(password, encoded)
    except (ValueError, TypeError):
        return False


def create_opaque_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def expires_in(*, hours: int = 0, days: int = 0, minutes: int = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=hours, days=days, minutes=minutes)


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
