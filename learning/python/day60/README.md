# Day 60 - JavaScript and Python Integration

## Purpose

Demonstrate a browser communicating with a Python
FastAPI service through HTTP and JSON.

This is a learning exercise, not a separate portfolio project.

## Architecture

Browser -> JavaScript fetch -> FastAPI
-> Pydantic -> ScoreService -> JSON -> Browser

## Technologies

- HTML, CSS and JavaScript
- Python 3.14
- FastAPI
- Pydantic
- Pytest

## Start Backend

From learning/python/day59:

    .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8011

## Start Frontend

From learning/python/day60:

    py -3 -m http.server 5500 --bind 127.0.0.1

Open:

http://127.0.0.1:5500/index.html

## Run Automated Tests

From learning/python/day59:

    .\.venv\Scripts\python.exe -m pytest test_api.py test_day60.py -v

## Important Features

- Browser-to-Python HTTP communication
- Loading, success and error states
- Pydantic request validation
- Restricted local development CORS
- Automated API and CORS tests
- ML prediction placeholder contract

## ML Endpoints

GET /model-info

Returns metadata for the future ML model.

POST /predict

Returns HTTP 501 because no model has been trained.

Invalid prediction input returns HTTP 422.

## Limitations

- Learning application only
- No trained ML model
- No authentication
- Score records stored in memory
- Development servers are not production hosting

## Future Connection

PredictIQ will replace placeholder predictions
with predictions from a trained ML model.
