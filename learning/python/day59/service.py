
from schemas import ScoreInput, ScoreResponse


class ScoreService:
    def __init__(self) -> None:
        self._scores: dict[int, ScoreResponse] = {}
        self._next_id = 1

    def create(self, data: ScoreInput) -> ScoreResponse:
        score = ScoreResponse(
            id=self._next_id,
            student_name=data.student_name,
            mark=data.mark,
            passed=data.mark >= 50,
        )

        self._scores[score.id] = score
        self._next_id += 1

        return score

    def list_scores(
        self,
        passed: bool | None = None
    ) -> list[ScoreResponse]:
        records = list(self._scores.values())

        if passed is None:
            return records

        return [
            record
            for record in records
            if record.passed == passed
        ]

    def get(
        self,
        score_id: int
    ) -> ScoreResponse | None:
        return self._scores.get(score_id)

    def update(
        self,
        score_id: int,
        data: ScoreInput
    ) -> ScoreResponse | None:
        if score_id not in self._scores:
            return None

        score = ScoreResponse(
            id=score_id,
            student_name=data.student_name,
            mark=data.mark,
            passed=data.mark >= 50,
        )

        self._scores[score_id] = score

        return score

    def delete(self, score_id: int) -> bool:
        if score_id not in self._scores:
            return False

        del self._scores[score_id]

        return True
