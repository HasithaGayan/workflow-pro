
# PDF Day 57 - Python Collections
# Lists, Dictionaries, Sets, Tuples and Type Hints

# 1. LIST - Store multiple tasks
tasks: list[dict[str, str]] = [
    {"title": "Build API", "status": "done"},
    {"title": "Design UI", "status": "todo"},
    {"title": "Write Tests", "status": "done"},
]

print("1. Total tasks:", len(tasks))


# 2. LIST COMPREHENSION - Filter completed tasks
completed_tasks = [
    task["title"]
    for task in tasks
    if task["status"] == "done"
]

print("2. Completed tasks:", completed_tasks)


# 3. SET - Store unique roles
roles: set[str] = {
    "owner", "admin", "member", "admin"
}

print("3. Unique roles:", len(roles))


# 4. DICTIONARY - Store member information
member: dict[str, str] = {
    "name": "Amal",
    "role": "owner"
}

print("4. Owner:", member["name"])


# 5. TUPLE - Fixed collection of valid statuses
statuses: tuple[str, ...] = (
    "todo",
    "in_progress",
    "done"
)

print("5. Valid statuses:", statuses)


# 6. FUNCTION WITH TYPE HINTS
def summarize(
    task_list: list[dict[str, str]]
) -> tuple[int, int]:
    total = len(task_list)

    completed = sum(
        1
        for task in task_list
        if task["status"] == "done"
    )

    return completed, total


done, total = summarize(tasks)

print(f"6. Summary: {done}/{total} done")


# Check our results
assert total == 3
assert done == 2
assert len(roles) == 3

print("All Day 57 collection checks passed!")
