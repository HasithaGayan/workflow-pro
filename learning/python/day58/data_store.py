
# Day 58 - Text, JSON and CSV Data Processing

import csv
import json
from pathlib import Path


VALID_STATUSES = {"todo", "done"}


def validate_records(data: object) -> list[dict[str, str]]:
    if not isinstance(data, list):
        raise ValueError("Data must be a list")

    cleaned = []

    for index, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Invalid record {index}")

        if set(item.keys()) != {"title", "status"}:
            raise ValueError(f"Invalid fields in record {index}")

        title = item["title"]
        status = item["status"]

        if not isinstance(title, str) or not title.strip():
            raise ValueError(f"Invalid title in record {index}")

        if not isinstance(status, str):
            raise ValueError(f"Invalid status in record {index}")

        if status not in VALID_STATUSES:
            raise ValueError(f"Unknown status in record {index}")

        cleaned.append({
            "title": title.strip(),
            "status": status,
        })

    return cleaned


# TEXT
def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as file:
        file.write(content)


def read_text(path: Path) -> str:
    with path.open("r", encoding="utf-8") as file:
        return file.read()


# JSON
def save_json(path: Path, records: object) -> None:
    validated = validate_records(records)

    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as file:
        json.dump(
            validated,
            file,
            indent=2,
            ensure_ascii=False,
        )


def load_json(path: Path) -> list[dict[str, str]]:
    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except json.JSONDecodeError as error:
        raise ValueError("Malformed JSON file") from error

    return validate_records(data)


# CSV
def save_csv(path: Path, records: object) -> None:
    validated = validate_records(records)

    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open(
        "w", encoding="utf-8", newline=""
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["title", "status"],
        )

        writer.writeheader()
        writer.writerows(validated)


def load_csv(path: Path) -> list[dict[str, str]]:
    try:
        with path.open(
            "r", encoding="utf-8", newline=""
        ) as file:
            reader = csv.DictReader(file, strict=True)

            if reader.fieldnames != ["title", "status"]:
                raise ValueError("Invalid CSV headers")

            records = list(reader)

    except csv.Error as error:
        raise ValueError("Malformed CSV file") from error

    return validate_records(records)


# DEMONSTRATION
def main() -> None:
    folder = Path(__file__).parent / "demo_output"

    records = [
        {"title": "Build API", "status": "done"},
        {"title": "Train AI Model", "status": "todo"},
        {"title": "Write Tests", "status": "done"},
    ]

    text_path = folder / "notes.txt"
    json_path = folder / "tasks.json"
    csv_path = folder / "tasks.csv"

    write_text(text_path, "Day 58 Python data project")

    save_json(json_path, records)
    save_csv(csv_path, records)

    json_data = load_json(json_path)
    csv_data = load_csv(csv_path)

    assert json_data == records
    assert csv_data == records

    print("Text:", read_text(text_path))
    print("JSON records:", len(json_data))
    print("CSV records:", len(csv_data))
    print("DAY 58 DATA PROCESSING PASSED")


if __name__ == "__main__":
    main()
