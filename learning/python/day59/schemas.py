
from pydantic import BaseModel, ConfigDict, Field


class ScoreInput(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True
    )

    student_name: str = Field(
        min_length=2,
        max_length=100
    )

    mark: float = Field(
        ge=0,
        le=100
    )


class ScoreResponse(BaseModel):
    id: int
    student_name: str
    mark: float
    passed: bool
