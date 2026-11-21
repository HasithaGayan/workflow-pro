
# Day 57 - Task Manager CLI

import argparse
import json
from pathlib import Path

from task_model import Task, VALID_STATUSES


def load_tasks(path: Path) -> list[Task]:
    if not path.exists():
        return []

    try:
        data = json.loads(
            path.read_text(encoding="utf-8")
        )
    except (ValueError, UnicodeError) as error:
        raise ValueError("Invalid task JSON file") from error

    if not isinstance(data, list):
        raise ValueError("Task data must be a list")

    tasks = []

    for item in data:
        if (
            not isinstance(item, dict)
            or not isinstance(item.get("title"), str)
            or not isinstance(item.get("status"), str)
        ):
            raise ValueError("Invalid task record")

        tasks.append(
            Task(item["title"], item["status"])
        )

    return tasks


def save_tasks(path: Path, tasks: list[Task]) -> None:
    data = [
        {"title": task.title, "status": task.status}
        for task in tasks
    ]

    path.write_text(
        json.dumps(data, indent=2),
        encoding="utf-8"
    )


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Python task manager"
    )

    parser.add_argument(
        "--file",
        type=Path,
        default=Path(__file__).with_name("tasks.json")
    )

    commands = parser.add_subparsers(
        dest="command",
        required=True
    )

    add_cmd = commands.add_parser("add")
    add_cmd.add_argument("title")
    add_cmd.add_argument(
        "--status",
        choices=VALID_STATUSES,
        default="todo"
    )

    list_cmd = commands.add_parser("list")
    list_cmd.add_argument(
        "--status",
        choices=VALID_STATUSES
    )

    done_cmd = commands.add_parser("done")
    done_cmd.add_argument("number", type=int)

    commands.add_parser("summary")

    args = parser.parse_args(argv)

    try:
        tasks = load_tasks(args.file)

        if args.command == "add":
            tasks.append(
                Task(args.title, args.status)
            )
            save_tasks(args.file, tasks)
            print("Task added successfully!")

        elif args.command == "list":
            found = False

            for index, task in enumerate(tasks, 1):
                if (
                    args.status is None
                    or task.status == args.status
                ):
                    print(f"{index}. {task.summary()}")
                    found = True

            if not found:
                print("No matching tasks")

        elif args.command == "done":
            if not 1 <= args.number <= len(tasks):
                raise ValueError(
                    "Task number out of range"
                )

            tasks[args.number - 1].mark_done()
            save_tasks(args.file, tasks)
            print("Task completed!")

        elif args.command == "summary":
            total = len(tasks)
            completed = sum(
                task.status == "done"
                for task in tasks
            )

            percentage = (
                round(completed / total * 100)
                if total else 0
            )

            print(
                f"Progress: {completed}/{total} "
                f"({percentage}%)"
            )

    except (ValueError, OSError) as error:
        parser.exit(
            status=1,
            message=f"Error: {error}\n"
        )


if __name__ == "__main__":
    main()
