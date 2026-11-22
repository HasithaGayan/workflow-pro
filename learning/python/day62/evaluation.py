from math import sqrt


def mean(values: list[float]) -> float:
    if not values:
        raise ValueError("Cannot calculate mean of empty data")

    return sum(values) / len(values)


def median(values: list[float]) -> float:
    if not values:
        raise ValueError("Cannot calculate median of empty data")

    ordered = sorted(values)
    n = len(ordered)
    middle = n // 2

    if n % 2 == 1:
        return float(ordered[middle])

    return (
        ordered[middle - 1] + ordered[middle]
    ) / 2


def variance(
    values: list[float],
    sample: bool = False
) -> float:
    if not values:
        raise ValueError("Data cannot be empty")

    if sample and len(values) < 2:
        raise ValueError("Sample variance requires 2+ values")

    average = mean(values)

    squared_errors = sum(
        (value - average) ** 2
        for value in values
    )

    denominator = len(values) - 1 if sample else len(values)

    return squared_errors / denominator


def standard_deviation(
    values: list[float],
    sample: bool = False
) -> float:
    return sqrt(variance(values, sample))


def validate_pairs(actual, predicted):
    if not actual or len(actual) != len(predicted):
        raise ValueError(
            "Actual and predicted values must have "
            "equal nonzero length"
        )


def regression_metrics(
    actual: list[float],
    predicted: list[float]
) -> dict[str, float]:
    validate_pairs(actual, predicted)

    errors = [
        a - p
        for a, p in zip(actual, predicted)
    ]

    mae = mean([
        abs(error)
        for error in errors
    ])

    rmse = sqrt(mean([
        error ** 2
        for error in errors
    ]))

    return {
        "mae": mae,
        "rmse": rmse
    }


def mean_baseline(
    training_targets: list[float],
    prediction_count: int
) -> list[float]:
    if prediction_count < 0:
        raise ValueError("Prediction count cannot be negative")

    baseline_value = mean(training_targets)

    return [
        baseline_value
        for _ in range(prediction_count)
    ]


def classification_metrics(
    actual: list[int],
    predicted: list[int]
) -> dict:
    validate_pairs(actual, predicted)

    if any(
        value not in (0, 1)
        for value in actual + predicted
    ):
        raise ValueError("Labels must be binary: 0 or 1")

    tp = sum(
        a == 1 and p == 1
        for a, p in zip(actual, predicted)
    )

    tn = sum(
        a == 0 and p == 0
        for a, p in zip(actual, predicted)
    )

    fp = sum(
        a == 0 and p == 1
        for a, p in zip(actual, predicted)
    )

    fn = sum(
        a == 1 and p == 0
        for a, p in zip(actual, predicted)
    )

    accuracy = (tp + tn) / len(actual)

    precision = (
        tp / (tp + fp)
        if tp + fp > 0 else 0.0
    )

    recall = (
        tp / (tp + fn)
        if tp + fn > 0 else 0.0
    )

    f1 = (
        2 * precision * recall / (precision + recall)
        if precision + recall > 0 else 0.0
    )

    return {
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1
    }


if __name__ == "__main__":
    print("=== STATISTICS ===")

    values = [2, 4, 6, 8]

    print("Mean:", mean(values))
    print("Median:", median(values))
    print("Population variance:", variance(values))
    print("Sample variance:", round(variance(values, True), 4))
    print("Population standard deviation:",
          round(standard_deviation(values), 4))

    print("\n=== REGRESSION ===")

    train_targets = [2, 4, 6, 8]
    test_targets = [3, 5, 7]

    model_predictions = [4, 5, 6]

    baseline_predictions = mean_baseline(
        train_targets,
        len(test_targets)
    )

    baseline = regression_metrics(
        test_targets,
        baseline_predictions
    )

    model = regression_metrics(
        test_targets,
        model_predictions
    )

    print("Baseline:", baseline)
    print("Example model:", model)

    print("\n=== CLASSIFICATION ===")

    actual = [1, 1, 0, 0, 1, 0, 1, 0]
    predicted = [1, 0, 0, 0, 1, 1, 0, 0]

    print(classification_metrics(actual, predicted))

    print("\n=== CLASS IMBALANCE ===")

    imbalanced_actual = [0] * 95 + [1] * 5
    always_negative = [0] * 100

    result = classification_metrics(
        imbalanced_actual,
        always_negative
    )

    print("Accuracy:", result["accuracy"])
    print("Positive-class recall:", result["recall"])