# Day 61 - Mathematics for Machine Learning

import math
import random


def linear_function(x: float) -> float:
    return 2 * x + 1


def dot_product(a: list[float], b: list[float]) -> float:
    if not a or len(a) != len(b):
        raise ValueError("Vectors must have equal nonzero length")

    return sum(x * y for x, y in zip(a, b))


def euclidean_distance(
    a: list[float],
    b: list[float]
) -> float:
    if not a or len(a) != len(b):
        raise ValueError("Vectors must have equal nonzero length")

    return math.sqrt(
        sum((x - y) ** 2 for x, y in zip(a, b))
    )


def matrix_multiply_2x2(
    a: list[list[float]],
    b: list[list[float]]
) -> list[list[float]]:
    if (
        len(a) != 2
        or len(b) != 2
        or any(len(row) != 2 for row in a + b)
    ):
        raise ValueError("Both matrices must be 2x2")

    return [
        [
            sum(a[i][k] * b[k][j] for k in range(2))
            for j in range(2)
        ]
        for i in range(2)
    ]


def conditional_probability(
    event: set[int],
    given: set[int]
) -> float:
    if not given:
        raise ValueError("Conditioning event cannot be empty")

    return len(event & given) / len(given)


def simulate_die(trials: int = 10000) -> tuple[float, float]:
    if trials <= 0:
        raise ValueError("Number of trials must be positive")

    rng = random.Random(61)

    rolls = [
        rng.randint(1, 6)
        for _ in range(trials)
    ]

    probability_even = sum(
        roll % 2 == 0 for roll in rolls
    ) / trials

    expected_value = sum(rolls) / trials

    return probability_even, expected_value


def gradient_step(
    weight: float,
    target: float,
    learning_rate: float = 0.1
) -> tuple[float, float]:
    # Loss = (weight - target) squared
    # Derivative = 2 * (weight - target)

    gradient = 2 * (weight - target)
    new_weight = weight - learning_rate * gradient

    return gradient, new_weight


if __name__ == "__main__":
    print("Function:", linear_function(3))
    print("Exponent:", 2 ** 3)
    print("Logarithm:", math.log2(8))
    print("Ratio:", 3 / 4)

    print(
        "Dot product:",
        dot_product([2, 3], [4, 5])
    )

    print(
        "Distance:",
        euclidean_distance([1, 2], [4, 6])
    )

    matrix_a = [[1, 2], [3, 4]]
    matrix_b = [[2, 0], [1, 2]]

    print(
        "Matrix multiplication:",
        matrix_multiply_2x2(matrix_a, matrix_b)
    )

    even = {2, 4, 6}
    greater_than_three = {4, 5, 6}

    print(
        "Conditional probability:",
        conditional_probability(even, greater_than_three)
    )

    probability, expectation = simulate_die()

    print("Simulated P(even):", round(probability, 3))
    print("Simulated E(die):", round(expectation, 3))

    gradient, new_weight = gradient_step(3, 5)

    print("Gradient:", gradient)
    print("Updated weight:", round(new_weight, 2))

    old_loss = (3 - 5) ** 2
    new_loss = (new_weight - 5) ** 2

    print("Old loss:", old_loss)
    print("New loss:", round(new_loss, 2))