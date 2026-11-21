
# Day 58 - Automated Data Tests

import pytest

from data_store import (
    write_text,
    read_text,
    save_json,
    load_json,
    save_csv,
    load_csv,
)


@pytest.fixture
def sample_tasks():
    return [
        {"title": "Build API", "status": "done"},
        {"title": "Train Model", "status": "todo"},
    ]


def test_text_roundtrip(tmp_path):
    path = tmp_path / "notes.txt"

    write_text(path, "Hello Python!")

    assert read_text(path) == "Hello Python!"


def test_json_roundtrip(tmp_path, sample_tasks):
    path = tmp_path / "tasks.json"

    save_json(path, sample_tasks)

    assert load_json(path) == sample_tasks


def test_csv_roundtrip(tmp_path, sample_tasks):
    path = tmp_path / "tasks.csv"

    save_csv(path, sample_tasks)

    assert load_csv(path) == sample_tasks


def test_malformed_json(tmp_path):
    path = tmp_path / "invalid.json"

    path.write_text(
        '{"title": ',
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="Malformed JSON"):
        load_json(path)


def test_missing_json(tmp_path):
    path = tmp_path / "missing.json"

    with pytest.raises(FileNotFoundError):
        load_json(path)


def test_invalid_task_status(tmp_path):
    path = tmp_path / "tasks.json"

    invalid = [
        {"title": "Build API", "status": "unknown"}
    ]

    with pytest.raises(ValueError, match="Unknown status"):
        save_json(path, invalid)


def test_invalid_csv_headers(tmp_path):
    path = tmp_path / "invalid.csv"

    path.write_text(
        "name,state\nTask,done\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="Invalid CSV headers"):
        load_csv(path)
