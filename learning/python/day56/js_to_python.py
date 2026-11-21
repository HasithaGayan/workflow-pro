
# Day 56 - JavaScript to Python Rewrite
# Utility: Calculate the sum of numbers

def sum_numbers(numbers):
    total = 0

    for number in numbers:
        total += number

    return total


# Test 1: Normal numbers
result1 = sum_numbers([10, 20, 30])
assert result1 == 60
print("Test 1 passed:", result1)

# Test 2: Empty list
result2 = sum_numbers([])
assert result2 == 0
print("Test 2 passed:", result2)

# Test 3: Negative numbers
result3 = sum_numbers([5, -3, 2])
assert result3 == 4
print("Test 3 passed:", result3)

print("All Python utility tests passed!")
