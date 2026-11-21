
# Day 56 - Python Fundamentals
# Exercises 1-15

from pathlib import Path

# Exercise 1: Variables and arithmetic
number1 = 20
number2 = 10

print("1. Sum:", number1 + number2)
print("1. Difference:", number1 - number2)

# Exercise 2: Conditions
marks = 75

if marks >= 50:
    print("2. Result: Pass")
else:
    print("2. Result: Fail")

# Exercise 3: For loop
total = 0

for number in range(1, 6):
    total = total + number

print("3. Total:", total)

# Exercise 4: Lists
scores = [65, 80, 90, 75]

print("4. Highest score:", max(scores))
print("4. Total scores:", len(scores))

# Exercise 5: Dictionaries
student = {
    "name": "Hasitha",
    "degree": "Artificial Intelligence",
    "year": 2
}

print("5. Student:", student["name"])
print("5. Year:", student["year"])

# Exercise 6: Functions
def calculate_total(price, quantity):
    return price * quantity

result = calculate_total(50, 3)

print("6. Total price:", result)

# Exercise 7: Strings
project_name = "workflow pro"

print("7. Uppercase:", project_name.upper())
print("7. Length:", len(project_name))

# Exercise 8: While loop
count = 1

while count <= 3:
    print("8. Count:", count)
    count = count + 1

# Exercise 9: Even numbers
numbers = [1, 2, 3, 4, 5, 6]
even_numbers = []

for number in numbers:
    if number % 2 == 0:
        even_numbers.append(number)

print("9. Even numbers:", even_numbers)

# Exercise 10: Sorting
marks_list = [45, 90, 70, 60]

sorted_marks = sorted(marks_list)

print("10. Sorted marks:", sorted_marks)

# Exercise 11: List comprehension
numbers = [1, 2, 3, 4, 5]

squares = [number ** 2 for number in numbers]

print("11. Squares:", squares)

# Exercise 12: Exception handling
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "Cannot divide by zero"

print("12. Division:", safe_divide(20, 4))
print("12. Error handling:", safe_divide(20, 0))

# Exercise 13: Tuples and sets
roles = ("owner", "admin", "member")

unique_roles = {"admin", "member", "admin"}

print("13. First role:", roles[0])
print("13. Unique roles:", len(unique_roles))

# Exercise 14: File handling
practice_file = Path(__file__).with_name(
    "day56_practice.txt"
)

# Create the practice file without overwriting
# an existing file.
if not practice_file.exists():
    practice_file.write_text(
        "Python file handling works!",
        encoding="utf-8"
    )

content = practice_file.read_text(encoding="utf-8")

print("14. File content:", content.strip())

# Exercise 15: Mini project - Task progress
tasks = [
    {"title": "Design Database", "done": True},
    {"title": "Build API", "done": False},
    {"title": "Write Tests", "done": True}
]

def calculate_progress(task_list):
    if len(task_list) == 0:
        return 0

    completed = sum(
        task["done"] for task in task_list
    )

    percentage = completed / len(task_list) * 100

    return round(percentage)

progress = calculate_progress(tasks)

print("15. Total tasks:", len(tasks))
print("15. Completion:", str(progress) + "%")
