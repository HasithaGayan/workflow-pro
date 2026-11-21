
# Day 57 - Python Classes and Type Hints

VALID_STATUSES = ("todo", "in_progress", "done")


class Task:
    def __init__(
        self,
        title: str,
        status: str = "todo"
    ) -> None:
        if not title.strip():
            raise ValueError("Task title cannot be empty")

        if status not in VALID_STATUSES:
            raise ValueError("Invalid task status")

        self.title = title
        self.status = status

    def mark_done(self) -> None:
        self.status = "done"

    def summary(self) -> str:
        return f"{self.title}: {self.status}"


if __name__ == "__main__":
    task = Task("Build API")

    print("Before:", task.summary())

    task.mark_done()

    print("After:", task.summary())

    assert task.status == "done"

    try:
        Task("Invalid task", "unknown")
    except ValueError:
        print("Invalid status correctly rejected")
    else:
        raise AssertionError("Validation failed")

    print("All Day 57 class checks passed!")
