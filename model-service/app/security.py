"""Service-to-service authentication.

The Next.js backend signs every request with a shared secret:

    signature = hex(HMAC-SHA256(secret, f"{timestamp}.{METHOD}.{path}.{raw_body}"))

and sends it in two headers. Signing the method, path and body means a captured
signature can't be reused for a different request; the timestamp bounds replay.
The browser never sees the secret: it only talks to Next.js.
"""

import hashlib
import hmac
import time

from fastapi import Depends, Header, HTTPException, Request, status

from app.config import Settings, get_settings

TIMESTAMP_HEADER = "X-CPDojo-Timestamp"
SIGNATURE_HEADER = "X-CPDojo-Signature"


def compute_signature(secret: str, timestamp: str, method: str, path: str, body: bytes) -> str:
    message = f"{timestamp}.{method.upper()}.{path}.".encode() + body
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


async def verify_signed_request(
    request: Request,
    timestamp: str | None = Header(default=None, alias=TIMESTAMP_HEADER),
    signature: str | None = Header(default=None, alias=SIGNATURE_HEADER),
    settings: Settings = Depends(get_settings),
) -> None:
    if timestamp is None or signature is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing signature headers")

    try:
        request_time = int(timestamp)
    except ValueError as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed timestamp") from error

    if abs(time.time() - request_time) > settings.max_clock_skew_seconds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Request timestamp outside allowed window")

    body = await request.body()
    expected_signature = compute_signature(
        settings.service_secret, timestamp, request.method, request.url.path, body
    )

    # constant-time comparison so response timing doesn't leak how many characters matched
    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid signature")
