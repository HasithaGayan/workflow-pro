import math

import pytest

from evaluation import (
    mean,
    median,
    variance,
    standard_deviation,
    regression_metrics,
    mean_baseline,
    classification_metrics,
)


def test_mean():
    assert mean([2, 4, 6, 8]) == 5


def test_median():
    assert median([1, 3, 5]) == 3
    assert median([1, 3, 5, 7]) == 4


def test_variance():
    assert variance([2, 4, 6]) == pytest.approx(8 / 3)
    assert variance([2, 4, 6], True) == pytest.approx(4)

    assert standard_deviation([2, 4, 6]) == pytest.approx(
        math.sqrt(8 / 3)
    )


def test_sample_variance_requires_two_values():
    with pytest.raises(ValueError):
        variance([5], sample=True)


def test_regression_metrics():
    result = regression_metrics(
        [3, 5, 7],
        [4, 5, 6]
    )

    assert result["mae"] == pytest.approx(2 / 3)
    assert result["rmse"] == pytest.approx(
        math.sqrt(2 / 3)
    )


def test_training_baseline():
    assert mean_baseline([10, 20], 3) == [
        15, 15, 15
    ]


def test_classification_metrics():
    result = classification_metrics(
        [1, 1, 0, 0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1, 1, 0, 0]
    )

    assert result["tp"] == 2
    assert result["tn"] == 3
    assert result["fp"] == 1
    assert result["fn"] == 2

    assert result["accuracy"] == pytest.approx(5 / 8)
    assert result["precision"] == pytest.approx(2 / 3)
    assert result["recall"] == pytest.approx(1 / 2)
    assert result["f1"] == pytest.approx(4 / 7)


def test_class_imbalance():
    actual = [0] * 95 + [1] * 5
    predicted = [0] * 100

    result = classification_metrics(actual, predicted)

    assert result["accuracy"] == 0.95
    assert result["recall"] == 0.0


def test_mismatched_lengths():
    with pytest.raises(ValueError):
        regression_metrics([1, 2], [1])


def test_invalid_classification_label():
    with pytest.raises(ValueError):
        classification_metrics([0, 2], [0, 1])


def test_empty_statistics():
    with pytest.raises(ValueError):
        mean([])