from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(tags=["Future ML Service"])


class PredictInput(BaseModel):
    features: list[float] = Field(
        min_length=1,
        max_length=20
    )


class PredictOutput(BaseModel):
    prediction: float
    model_name: str
    model_version: str


class ModelInfo(BaseModel):
    model_name: str
    model_version: str
    trained: bool


@router.get(
    "/model-info",
    response_model=ModelInfo
)
def model_info() -> ModelInfo:
    return ModelInfo(
        model_name="PredictIQ Placeholder",
        model_version="0.0.0",
        trained=False
    )


@router.post(
    "/predict",
    response_model=PredictOutput,
    responses={
        501: {
            "description": "ML model not implemented"
        }
    }
)
def predict(data: PredictInput) -> PredictOutput:
    raise HTTPException(
        status_code=501,
        detail="ML model not trained. Prediction unavailable."
    )