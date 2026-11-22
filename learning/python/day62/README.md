# Day 62 — Statistics and ML Evaluation

## Purpose

Learn how to evaluate machine-learning models correctly,
compare them against baselines, and recognize misleading
evaluation results.

This prepares us for Project 04 — PredictIQ.

## Concepts

### Descriptive Statistics

Mean: Sum of values / Number of values

Median: Middle value after sorting

Population variance:
Sum of squared deviations / n

Sample variance:
Sum of squared deviations / (n - 1)

Standard deviation:
Square root of variance

Example dataset: [2, 4, 6, 8]

Mean = 5
Median = 5
Population variance = 5
Sample variance = 6.6667
Population standard deviation = 2.2361

### Regression Metrics

MAE = Mean absolute error

RMSE = Root mean squared error

Lower MAE/RMSE is generally better when comparing
predictions against the same target data.

Example:

Actual: [3, 5, 7]

Training targets: [2, 4, 6, 8]

Mean baseline predicts: [5, 5, 5]

Candidate predictions: [4, 5, 6]

Mean baseline:
MAE = 1.3333
RMSE = 1.6330

Candidate:
MAE = 0.6667
RMSE = 0.8165

The candidate performs better on this small toy example.

This is not evidence of a trained ML model.

### Classification Metrics

Accuracy = (TP + TN) / Total

Precision = TP / (TP + FP)

Recall = TP / (TP + FN)

F1 = 2 * Precision * Recall / (Precision + Recall)

TP = True Positive
TN = True Negative
FP = False Positive
FN = False Negative

When denominators are zero, metric handling must
be defined explicitly.

### Class Imbalance

Suppose 100 transactions contain:

95 legitimate transactions
5 fraudulent transactions

A classifier predicts legitimate for every transaction.

Accuracy = 95%

Fraud recall = 0%

Therefore, high accuracy can be misleading.

### Train / Validation / Test

Training set:
Fit preprocessing and train the model.

Validation set:
Choose configurations and tune hyperparameters.

Test set:
Evaluate the chosen approach on unseen data.

Never use test results repeatedly to tune the model.

### Data Leakage

Example 1:
Fitting a scaler on the entire dataset before splitting.

Example 2:
Using information unavailable at prediction time.

Example 3:
Allowing records from the same person or group into
both training and test sets when independence matters.

Leakage can create unrealistically good model metrics.

### Baselines

A baseline is a simple reference approach.

Regression example:
Always predict the training-target mean.

Classification example:
Always predict the majority training class.

A more complex model should demonstrate meaningful
improvement over a suitable baseline.

### Distributions and Sampling

Different data distributions affect appropriate
summaries, model assumptions, and evaluation.

A sample should represent the intended population.

For time-dependent data, random splitting may be
inappropriate because it can introduce future information.

## Program Files

evaluation.py:
Statistics, regression metrics, classification metrics,
and mean-baseline implementation.

test_evaluation.py:
Automated correctness and edge-case tests.

## Run

From the workflow-pro repository root:

py -3 learning/python/day62/evaluation.py

Run tests:

python -m pytest learning/python/day62/test_evaluation.py -v

## Current Verification

The program uses deterministic toy examples.

It does not train a real ML model.

## Connection to PredictIQ

PredictIQ will use appropriate evaluation metrics,
leakage-safe preprocessing, baseline comparisons,
and documented limitations when training a real model.

## Interview Explanation

A model is not good merely because accuracy is high.

We must consider the problem, class distribution,
baseline, suitable metrics, data leakage,
and performance on genuinely unseen data.
