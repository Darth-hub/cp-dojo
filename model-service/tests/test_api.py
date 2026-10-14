"""Integration tests: real FastAPI app, Codeforces mocked at the HTTP layer."""

import json
import time

import httpx
import respx

from app.security import compute_signature
from tests.conftest import TEST_CODEFORCES_URL, make_submission, signed_headers

TRAIN_BODY = json.dumps({"cf_handle": "tourist", "platform_rating": 1500}).encode()


def codeforces_ok(submission_count: int) -> httpx.Response:
    submissions = [
        make_submission(i, "A", 800 + 100 * i, ["dp"], "OK" if i % 2 else "WRONG_ANSWER", i)
        for i in range(submission_count)
    ]
    return httpx.Response(200, json={"status": "OK", "result": submissions})


def test_health_needs_no_auth(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


class TestAuthentication:
    def test_rejects_missing_signature(self, client):
        response = client.post("/v1/models", content=TRAIN_BODY, headers={"Content-Type": "application/json"})
        assert response.status_code == 401

    def test_rejects_wrong_secret(self, client):
        headers = signed_headers(TRAIN_BODY, secret="a-different-secret-of-at-least-32-chars")
        assert client.post("/v1/models", content=TRAIN_BODY, headers=headers).status_code == 401

    def test_rejects_tampered_body(self, client):
        headers = signed_headers(TRAIN_BODY)
        tampered_body = json.dumps({"cf_handle": "someoneelse", "platform_rating": 1500}).encode()
        assert client.post("/v1/models", content=tampered_body, headers=headers).status_code == 401

    def test_rejects_stale_timestamp(self, client):
        headers = signed_headers(TRAIN_BODY, timestamp=int(time.time()) - 3600)
        assert client.post("/v1/models", content=TRAIN_BODY, headers=headers).status_code == 401


class TestTrainEndpoint:
    @respx.mock
    def test_trains_model_from_codeforces_history(self, client):
        respx.get(f"{TEST_CODEFORCES_URL}/user.status").mock(return_value=codeforces_ok(12))

        response = client.post("/v1/models", content=TRAIN_BODY, headers=signed_headers(TRAIN_BODY))

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "trained"
        assert payload["model"]["training_examples"] == 12
        assert set(payload["model"]["weights"]) == {"w0", "w1", "w2"}

    @respx.mock
    def test_cold_start_returns_no_model(self, client):
        respx.get(f"{TEST_CODEFORCES_URL}/user.status").mock(return_value=codeforces_ok(2))

        response = client.post("/v1/models", content=TRAIN_BODY, headers=signed_headers(TRAIN_BODY))

        assert response.status_code == 200
        assert response.json() == {"status": "cold_start", "model": None}

    @respx.mock
    def test_second_request_is_served_from_cache(self, client):
        codeforces_route = respx.get(f"{TEST_CODEFORCES_URL}/user.status").mock(
            return_value=codeforces_ok(12)
        )

        for _ in range(2):
            client.post("/v1/models", content=TRAIN_BODY, headers=signed_headers(TRAIN_BODY))

        assert codeforces_route.call_count == 1

    @respx.mock
    def test_codeforces_error_maps_to_502(self, client):
        respx.get(f"{TEST_CODEFORCES_URL}/user.status").mock(
            return_value=httpx.Response(400, json={"status": "FAILED", "comment": "handle not found"})
        )

        response = client.post("/v1/models", content=TRAIN_BODY, headers=signed_headers(TRAIN_BODY))

        assert response.status_code == 502

    @respx.mock
    def test_codeforces_timeout_maps_to_502(self, client):
        respx.get(f"{TEST_CODEFORCES_URL}/user.status").mock(side_effect=httpx.ConnectTimeout("slow"))

        response = client.post("/v1/models", content=TRAIN_BODY, headers=signed_headers(TRAIN_BODY))

        assert response.status_code == 502

    def test_invalid_handle_is_rejected_before_any_network_call(self, client):
        body = json.dumps({"cf_handle": "bad handle; drop", "platform_rating": 1500}).encode()
        response = client.post("/v1/models", content=body, headers=signed_headers(body))
        assert response.status_code == 422


def test_signature_matches_known_vector():
    # Same vector is asserted in lib/modelService.test.ts so both sides stay in sync.
    signature = compute_signature(
        "test-secret-that-is-at-least-32-characters-long",
        "1700000000",
        "POST",
        "/v1/models",
        b'{"cf_handle":"tourist","platform_rating":1500}',
    )
    assert signature == KNOWN_SIGNATURE


KNOWN_SIGNATURE = "4b15674ee29ca2dfeb83d93fc0931e061fcca2d9f66a4a2e29ea60e6fa15d4e7"
