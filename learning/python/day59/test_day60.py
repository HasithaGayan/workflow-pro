from fastapi.testclient import TestClient

from main import app


client = TestClient(app)

FRONTEND = "http://127.0.0.1:5500"


def preflight(origin, method="POST"):
    return client.options(
        "/scores",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "content-type"
        }
    )


def test_allowed_frontend_origin():
    response = preflight(FRONTEND)

    assert response.status_code == 200

    assert (
        response.headers["access-control-allow-origin"]
        == FRONTEND
    )


def test_unknown_origin_rejected():
    response = preflight(
        "https://unauthorized.example"
    )

    assert response.status_code == 400

    assert (
        "access-control-allow-origin"
        not in response.headers
    )


def test_disallowed_method_rejected():
    response = preflight(FRONTEND, "PATCH")

    assert response.status_code == 400


def test_model_metadata():
    response = client.get("/model-info")

    assert response.status_code == 200

    data = response.json()

    assert data["trained"] is False
    assert data["model_version"] == "0.0.0"


def test_predict_not_implemented():
    response = client.post(
        "/predict",
        json={"features": [1.0, 2.0]}
    )

    assert response.status_code == 501
    assert "not trained" in response.json()["detail"]


def test_predict_invalid_input():
    response = client.post(
        "/predict",
        json={"features": []}
    )

    assert response.status_code == 422