from typing import Annotated

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Response,
    status,
)

from fastapi.middleware.cors import CORSMiddleware

from schemas import ScoreInput, ScoreResponse
from service import ScoreService
from ml_contract import router as ml_router


app = FastAPI(
    title="HGBP Student Score API",
    version="1.3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)

# Register our future ML endpoints
app.include_router(ml_router)

score_service = ScoreService()


def get_score_service() -> ScoreService:
    return score_service


Service = Annotated[
    ScoreService,
    Depends(get_score_service)
]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/scores",
    response_model=ScoreResponse,
    status_code=status.HTTP_201_CREATED
)
def create_score(
    data: ScoreInput,
    service: Service
) -> ScoreResponse:
    return service.create(data)


@app.get(
    "/scores",
    response_model=list[ScoreResponse]
)
def list_scores(
    service: Service,
    passed: bool | None = None
) -> list[ScoreResponse]:
    return service.list_scores(passed)


@app.get(
    "/scores/{score_id}",
    response_model=ScoreResponse
)
def get_score(
    score_id: int,
    service: Service
) -> ScoreResponse:

    result = service.get(score_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Score not found"
        )

    return result


@app.put(
    "/scores/{score_id}",
    response_model=ScoreResponse
)
def update_score(
    score_id: int,
    data: ScoreInput,
    service: Service
) -> ScoreResponse:

    result = service.update(score_id, data)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Score not found"
        )

    return result


@app.delete(
    "/scores/{score_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_score(
    score_id: int,
    service: Service
) -> Response:

    if not service.delete(score_id):
        raise HTTPException(
            status_code=404,
            detail="Score not found"
        )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )