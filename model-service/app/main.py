"""CP-Dojo model service: trains the per-user adaptive-difficulty model."""

import logging
from functools import lru_cache

from fastapi import Depends, FastAPI, HTTPException, status

from app.cache import TTLCache
from app.codeforces import CodeforcesClient, CodeforcesError
from app.config import get_settings
from app.model import TrainedModel, build_model
from app.schemas import ModelPayload, TrainModelRequest, TrainModelResponse, WeightsPayload
from app.security import verify_signed_request

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("model-service")

app = FastAPI(title="CP-Dojo Model Service", version="1.0.0")


@lru_cache
def get_codeforces_client() -> CodeforcesClient:
    settings = get_settings()
    return CodeforcesClient(settings.codeforces_base_url, settings.codeforces_timeout_seconds)


@lru_cache
def get_model_cache() -> TTLCache[TrainedModel]:
    settings = get_settings()
    return TTLCache(settings.model_cache_ttl_seconds, settings.model_cache_max_entries)


def to_response(trained_model: TrainedModel | None) -> TrainModelResponse:
    if trained_model is None:
        return TrainModelResponse(status="cold_start", model=None)

    return TrainModelResponse(
        status="trained",
        model=ModelPayload(
            weights=WeightsPayload(
                w0=trained_model.weights.w0,
                w1=trained_model.weights.w1,
                w2=trained_model.weights.w2,
            ),
            tag_solve_rate=trained_model.tag_solve_rate,
            training_examples=trained_model.training_examples,
        ),
    )


@app.get("/health")
async def health() -> dict[str, str]:
    # Unauthenticated on purpose: the load balancer's health checks call it.
    return {"status": "ok"}


@app.post(
    "/v1/models",
    response_model=TrainModelResponse,
    dependencies=[Depends(verify_signed_request)],
)
async def train_model(
    request: TrainModelRequest,
    codeforces: CodeforcesClient = Depends(get_codeforces_client),
    model_cache: TTLCache[TrainedModel] = Depends(get_model_cache),
) -> TrainModelResponse:
    cache_key = f"{request.cf_handle.lower()}:{request.platform_rating}"

    cached_model = model_cache.get(cache_key)
    if cached_model is not None:
        logger.info("cache hit handle=%s", request.cf_handle)
        return to_response(cached_model)

    try:
        submissions = await codeforces.get_user_submissions(request.cf_handle)
    except CodeforcesError as error:
        logger.warning("codeforces failure handle=%s error=%s", request.cf_handle, error)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Codeforces unavailable") from error

    trained_model = build_model(submissions, request.platform_rating)

    # Cold-start results aren't cached, so a new user's model appears as soon as
    # they cross the floor instead of after the TTL.
    if trained_model is not None:
        model_cache.set(cache_key, trained_model)

    logger.info(
        "trained handle=%s submissions=%d examples=%s",
        request.cf_handle,
        len(submissions),
        trained_model.training_examples if trained_model else "cold_start",
    )
    return to_response(trained_model)
