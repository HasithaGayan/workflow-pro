# Day 58 - Python Data Processing

A reproducible Python project for text, JSON and CSV
processing, input validation and automated testing.

## Requirements

- Python 3.14
- pip

## Fresh Windows Setup

Open PowerShell in this Day 58 directory.

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Run

```powershell
.\.venv\Scripts\python.exe data_store.py
```

## Test

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

## Features

- Read and write UTF-8 text files
- Read and write JSON
- Read and write CSV
- Validate task records
- Reject missing or malformed data
- Automated pytest tests

## Architecture

data_store.py contains the data processing functions.

test_data_store.py contains automated tests.

requirements.txt records dependencies.

.gitignore excludes local environments and generated files.

## Technical Notes

Context managers close files automatically.

CSV uses newline="" for correct file handling.

Tests use temporary directories instead of production data.

The virtual environment and demo output are not committed.
