"""Request/response contracts for the HTTP API."""

from typing import Literal

from pydantic import BaseModel, Field

# Codeforces handles: 3-24 chars of letters, digits, underscore, dot, hyphen.
CODEFORCES_HANDLE_PATTERN = r"^[A-Za-z0-9_.\-]{3,24}$"


class TrainModelRequest(BaseModel):
    cf_handle: str = Field(pattern=CODEFORCES_HANDLE_PATTERN)
    platform_rating: int = Field(ge=0, le=5000)


class WeightsPayload(BaseModel):
    w0: float
    w1: float
    w2: float


class ModelPayload(BaseModel):
    weights: WeightsPayload
    tag_solve_rate: dict[str, float]
    training_examples: int


class TrainModelResponse(BaseModel):
    status: Literal["trained", "cold_start"]
    model: ModelPayload | None
