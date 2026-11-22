# Day 59 — Student Score REST API

A Python FastAPI project demonstrating validated REST
endpoints, CRUD operations and automated API testing.

## Technologies

- Python 3.14
- FastAPI
- Pydantic
- Uvicorn
- Pytest and HTTPX

## Architecture

- schemas.py: Request and response validation
- service.py: Business logic and in-memory records
- main.py: HTTP routes and status codes
- test_api.py: Automated tests

Request flow:

Client -> FastAPI -> Pydantic -> ScoreService -> JSON

## Setup

Open PowerShell in this directory.

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Start Server

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8011
```

Open http://127.0.0.1:8011/docs

## Run Tests

```powershell
.\.venv\Scripts\python.exe -m pytest test_api.py -v
```

## Endpoints

- GET /health
- POST /scores
- GET /scores
- GET /scores/{score_id}
- PUT /scores/{score_id}
- DELETE /scores/{score_id}

## Validation

Student names must contain 2–100 characters.

Marks must be between 0 and 100.

Invalid input returns HTTP 422.
Missing records return HTTP 404.

## Limitations

- Records are stored only in process memory.
- Data is lost after a server restart.
- Authentication is not implemented.
- This learning API is not production-ready.

## Future Application

The architecture will support future ML prediction
endpoints in the PredictIQ project.
