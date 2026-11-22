import math
import pytest

from ml_math import (
    linear_function,
    dot_product,
    euclidean_distance,
    matrix_multiply_2x2,
    conditional_probability,
    simulate_die,
    gradient_step,
)


def test_function():
    assert linear_function(3) == 7


def test_dot_product():
    assert dot_product([2, 3], [4, 5]) == 23


def test_distance():
    assert euclidean_distance([1, 2], [4, 6]) == 5


def test_matrix_multiplication():
    a = [[1, 2], [3, 4]]
    b = [[2, 0], [1, 2]]

    assert matrix_multiply_2x2(a, b) == [
        [4, 4],
        [10, 8],
    ]


def test_conditional_probability():
    result = conditional_probability(
        {2, 4, 6},
        {4, 5, 6}
    )

    assert math.isclose(result, 2 / 3)


def test_simulation():
    probability, expectation = simulate_die(10000)

    assert abs(probability - 0.5) < 0.03
    assert abs(expectation - 3.5) < 0.1


def test_gradient_improves_loss():
    gradient, new_weight = gradient_step(3, 5)

    assert gradient == -4
    assert math.isclose(new_weight, 3.4)
    assert (new_weight - 5) ** 2 < (3 - 5) ** 2


def test_invalid_vector_dimensions():
    with pytest.raises(ValueError):
        dot_product([1, 2], [1])


def test_invalid_simulation():
    with pytest.raises(ValueError):
        simulate_die(0)