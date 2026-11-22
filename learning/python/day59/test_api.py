
import pytest

from fastapi.testclient import TestClient

from main import app, get_score_service
from service import ScoreService


@pytest.fixture
def client():
    isolated_service = ScoreService()

    app.dependency_overrides[get_score_service] = (
        lambda: isolated_service
    )

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_score(client):
    response = client.post(
        "/scores",
        json={"student_name": "Amal", "mark": 75},
    )

    assert response.status_code == 201

    assert response.json() == {
        "id": 1,
        "student_name": "Amal",
        "mark": 75.0,
        "passed": True,
    }


def test_invalid_mark(client):
    response = client.post(
        "/scores",
        json={"student_name": "Amal", "mark": 150},
    )

    assert response.status_code == 422


def test_invalid_student_name(client):
    response = client.post(
        "/scores",
        json={"student_name": "A", "mark": 75},
    )

    assert response.status_code == 422


def test_list_filter(client):
    client.post(
        "/scores",
        json={"student_name": "Amal", "mark": 75},
    )

    client.post(
        "/scores",
        json={"student_name": "Nimal", "mark": 30},
    )

    response = client.get("/scores?passed=true")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["student_name"] == "Amal"


def test_get_missing(client):
    response = client.get("/scores/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Score not found"


def test_update_score(client):
    client.post(
        "/scores",
        json={"student_name": "Amal", "mark": 25},
    )

    response = client.put(
        "/scores/1",
        json={"student_name": "Amal", "mark": 85},
    )

    assert response.status_code == 200
    assert response.json()["passed"] is True
    assert response.json()["mark"] == 85


def test_delete_score(client):
    client.post(
        "/scores",
        json={"student_name": "Amal", "mark": 75},
    )

    response = client.delete("/scores/1")

    assert response.status_code == 204
    assert response.content == b""

    assert client.get("/scores/1").status_code == 404


def test_cannot_update_missing(client):
    response = client.put(
        "/scores/99",
        json={"student_name": "Amal", "mark": 75},
    )

    assert response.status_code == 404
