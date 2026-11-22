
from typing import Annotated

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Response,
    status,
)

from schemas import ScoreInput, ScoreResponse
from service import ScoreService


app = FastAPI(
    title="HGBP Student Score API",
    version="1.1.0",
)

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


# CREATE
@app.post(
    "/scores",
    response_model=ScoreResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_score(
    data: ScoreInput,
    service: Service
) -> ScoreResponse:
    return service.create(data)


# READ ALL
@app.get(
    "/scores",
    response_model=list[ScoreResponse],
)
def list_scores(
    service: Service,
    passed: bool | None = None
) -> list[ScoreResponse]:
    return service.list_scores(passed)


# READ ONE
@app.get(
    "/scores/{score_id}",
    response_model=ScoreResponse,
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


# UPDATE
@app.put(
    "/scores/{score_id}",
    response_model=ScoreResponse,
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


# DELETE
@app.delete(
    "/scores/{score_id}",
    status_code=status.HTTP_204_NO_CONTENT,
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
