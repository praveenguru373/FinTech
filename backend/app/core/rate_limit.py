import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

_attempts: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def enforce_rate_limit(request: Request, *, action: str, limit: int, window_seconds: int = 60) -> None:
    client_ip = request.client.host if request.client else "unknown"
    key = f"{action}:{client_ip}"
    now = time.monotonic()
    with _lock:
        attempts = _attempts[key]
        while attempts and now - attempts[0] >= window_seconds:
            attempts.popleft()
        if len(attempts) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please wait a minute and try again.",
                headers={"Retry-After": str(window_seconds)},
            )
        attempts.append(now)


def clear_rate_limits() -> None:
    with _lock:
        _attempts.clear()
