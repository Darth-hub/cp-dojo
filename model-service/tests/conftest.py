import os
import time

import pytest

TEST_SECRET = "test-secret-that-is-at-least-32-characters-long"
TEST_CODEFORCES_URL = "https://codeforces.test/api"

os.environ["MODEL_SERVICE_SECRET"] = TEST_SECRET
os.environ["CODEFORCES_BASE_URL"] = TEST_CODEFORCES_URL

from fastapi.testclient import TestClient  # noqa: E402

from app import main  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.security import SIGNATURE_HEADER, TIMESTAMP_HEADER, compute_signature  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_dependencies():
    # each test gets fresh settings, a fresh HTTP client and an empty model cache
    get_settings.cache_clear()
    main.get_codeforces_client.cache_clear()
    main.get_model_cache.cache_clear()
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(main.app)


def make_submission(
    contest_id: int, index: str, rating: int | None, tags: list[str], verdict: str, created_at: int
) -> dict:
    return {
        "problem": {"contestId": contest_id, "index": index, "rating": rating, "tags": tags},
        "verdict": verdict,
        "creationTimeSeconds": created_at,
    }


def signed_headers(
    body: bytes,
    path: str = "/v1/models",
    method: str = "POST",
    timestamp: int | None = None,
    secret: str = TEST_SECRET,
) -> dict[str, str]:
    request_timestamp = str(timestamp if timestamp is not None else int(time.time()))
    return {
        "Content-Type": "application/json",
        TIMESTAMP_HEADER: request_timestamp,
        SIGNATURE_HEADER: compute_signature(secret, request_timestamp, method, path, body),
    }
