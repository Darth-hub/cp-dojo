"""Thin async client for the public Codeforces API."""

import httpx


class CodeforcesError(Exception):
    """Codeforces was unreachable, timed out, or returned a non-OK status."""


class CodeforcesClient:
    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = httpx.Timeout(timeout_seconds)

    async def get_user_submissions(self, handle: str) -> list[dict]:
        url = f"{self._base_url}/user.status"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, params={"handle": handle})
        except httpx.HTTPError as error:
            raise CodeforcesError(f"Codeforces request failed: {error.__class__.__name__}") from error

        try:
            payload = response.json()
        except ValueError as error:
            raise CodeforcesError(f"Codeforces returned non-JSON (HTTP {response.status_code})") from error

        if payload.get("status") != "OK":
            raise CodeforcesError(payload.get("comment", "Codeforces returned an error"))

        return payload["result"]
