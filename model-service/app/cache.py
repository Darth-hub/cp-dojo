"""Small in-process TTL cache.

Training needs the user's full Codeforces history, so caching the trained model
for a few minutes keeps repeated page loads from hammering Codeforces.
Per-instance only: with several instances each keeps its own copy, which is fine
because a stale model just means slightly older weights.
"""

import time
from collections import OrderedDict
from typing import Generic, TypeVar

CachedValue = TypeVar("CachedValue")


class TTLCache(Generic[CachedValue]):
    def __init__(self, ttl_seconds: int, max_entries: int) -> None:
        self._ttl_seconds = ttl_seconds
        self._max_entries = max_entries
        self._entries: OrderedDict[str, tuple[float, CachedValue]] = OrderedDict()

    def get(self, key: str) -> CachedValue | None:
        entry = self._entries.get(key)
        if entry is None:
            return None

        expires_at, value = entry
        if time.monotonic() >= expires_at:
            del self._entries[key]
            return None

        self._entries.move_to_end(key)
        return value

    def set(self, key: str, value: CachedValue) -> None:
        self._entries[key] = (time.monotonic() + self._ttl_seconds, value)
        self._entries.move_to_end(key)

        # evict least-recently-used entries once over capacity
        while len(self._entries) > self._max_entries:
            self._entries.popitem(last=False)
