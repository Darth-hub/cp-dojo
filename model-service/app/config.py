"""Runtime settings, read once from environment variables."""

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    # Shared secret used to sign requests from the Next.js backend (HMAC-SHA256).
    service_secret: str
    # Requests whose timestamp is further than this from server time are rejected,
    # which bounds how long a captured request can be replayed.
    max_clock_skew_seconds: int
    codeforces_base_url: str
    codeforces_timeout_seconds: float
    model_cache_ttl_seconds: int
    model_cache_max_entries: int


@lru_cache
def get_settings() -> Settings:
    service_secret = os.environ.get("MODEL_SERVICE_SECRET", "")
    if len(service_secret) < 32:
        raise RuntimeError("MODEL_SERVICE_SECRET must be set and at least 32 characters long")

    return Settings(
        service_secret=service_secret,
        max_clock_skew_seconds=int(os.environ.get("MAX_CLOCK_SKEW_SECONDS", "300")),
        codeforces_base_url=os.environ.get("CODEFORCES_BASE_URL", "https://codeforces.com/api"),
        codeforces_timeout_seconds=float(os.environ.get("CODEFORCES_TIMEOUT_SECONDS", "8")),
        model_cache_ttl_seconds=int(os.environ.get("MODEL_CACHE_TTL_SECONDS", "600")),
        model_cache_max_entries=int(os.environ.get("MODEL_CACHE_MAX_ENTRIES", "1000")),
    )
