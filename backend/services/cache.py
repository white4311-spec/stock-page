import time
from typing import Any

_store: dict[str, tuple[Any, float]] = {}


def get(key: str) -> Any | None:
    entry = _store.get(key)
    if entry and time.time() < entry[1]:
        return entry[0]
    return None


def set(key: str, value: Any, ttl: int) -> None:
    _store[key] = (value, time.time() + ttl)


def delete(key: str) -> None:
    _store.pop(key, None)
