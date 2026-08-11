"""Lightweight in-memory rate limiting (per client IP, sliding window).

Dependency-free so it works out of the box. Note: state is per-process, so in a
multi-instance deployment each instance limits independently. For a single
instance (the common case here) this is sufficient to stop brute-force login
attempts, password-reset email abuse, and runaway calls to paid chat APIs. For
horizontal scaling, back this with Redis instead.
"""

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import HTTPException, Request, status


def client_ip(request: Request) -> str:
    """Best-effort client IP, honoring a single proxy hop via X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


class SlidingWindowLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.time()
        window_start = now - self.window_seconds
        hits = self._hits[key]

        while hits and hits[0] <= window_start:
            hits.popleft()

        if len(hits) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - hits[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again shortly.",
                headers={"Retry-After": str(max(retry_after, 1))},
            )

        hits.append(now)
        if not hits:  # pragma: no cover - defensive
            self._hits.pop(key, None)


def rate_limiter(max_requests: int, window_seconds: int):
    """Return a FastAPI dependency enforcing the given per-IP limit."""
    limiter = SlidingWindowLimiter(max_requests, window_seconds)

    async def dependency(request: Request) -> None:
        limiter.check(client_ip(request))

    return dependency


# Shared limiter dependencies for specific endpoints.
login_rate_limit = rate_limiter(max_requests=10, window_seconds=60)
register_rate_limit = rate_limiter(max_requests=5, window_seconds=60)
forgot_password_rate_limit = rate_limiter(max_requests=3, window_seconds=300)
reset_password_rate_limit = rate_limiter(max_requests=5, window_seconds=300)
chat_rate_limit = rate_limiter(max_requests=30, window_seconds=60)
upload_rate_limit = rate_limiter(max_requests=20, window_seconds=60)
