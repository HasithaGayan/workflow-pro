
# Day 61 — Machine Learning Mathematics Cheat Sheet

## Purpose
Understand the mathematics behind training and evaluating
machine-learning models.

| Concept | Simple meaning | Worked example | ML application |
|---|---|---|---|
| Function | A rule mapping input to output | f(x) = 2x + 1; f(3) = 7 | Predictions |
| Exponent | Repeated multiplication | 2³ = 8 | Squared loss |
| Logarithm | Inverse of exponentiation | log₂(8) = 3 | Log loss |
| Ratio | Comparison by division | 3/4 = 0.75 | Metrics |
| Vector | Ordered list of numbers | [2, 3] | Feature representation |
| Dot product | Multiply corresponding values and sum | [2,3] · [4,5] = 8 + 15 = 23 | Weighted sums |
| Euclidean distance | Straight-line distance between points | (1,2) to (4,6): √(3²+4²) = 5 | KNN and clustering |
| Matrix multiplication | Combine rows and columns using dot products | [[1,2],[3,4]] × [[2,0],[1,2]] = [[4,4],[10,8]] | Neural networks |
| Probability | Likelihood of an event | P(even on fair die) = 3/6 = 0.5 | Classification |
| Conditional probability | Probability given an event occurred | P(even \| roll ≥ 4) = 2/3 | Bayesian models |
| Expected value | Probability-weighted average | E(fair die) = (1+2+3+4+5+6)/6 = 3.5 | Expected outcomes |
| Derivative | Local rate of change | f(x)=x²; f'(x)=2x; f'(3)=6 | Optimization |
| Gradient | Partial derivatives showing local direction of change | For L(w,b)=(w-2)²+(b-1)², gradient at (3,1) is [2,0] | Model training |

## Gradient Descent — Worked Example

Loss function:

L(w) = (w - 5)²

Starting weight: w = 3
Learning rate: 0.1

Step 1: Calculate original loss.

L(3) = (3 - 5)² = 4

Step 2: Calculate the derivative.

dL/dw = 2(w - 5)

At w = 3:

Gradient = 2(3 - 5) = -4

Step 3: Update weight.

New weight = Old weight - Learning rate × Gradient

New weight = 3 - 0.1(-4) = 3.4

Step 4: Calculate updated loss.

L(3.4) = (3.4 - 5)² = 2.56

Result: Loss decreased from 4 to 2.56.

Meaning:
Gradient descent adjusts model parameters in the
direction opposite to the gradient to try to
reduce the loss function.

The learning rate controls the update size.
An excessively large learning rate can cause
optimization to overshoot or become unstable.

## Python Probability Simulation

For 10,000 simulated fair-die rolls:

- Estimated P(even) should be close to 0.5.
- Estimated expected value should be close to 3.5.
- Results can fluctuate due to randomness.
- Setting a random seed makes experiments reproducible.

## Connection to PredictIQ

Input features -> Mathematical operations -> Prediction
Prediction + Actual value -> Loss calculation
Loss -> Gradient/optimization -> Improved model parameters

Models must also be evaluated using suitable
validation/test data and appropriate metrics.

## Important Interview Points

1. Dot products combine feature values and weights.
2. Distance helps measure similarity between data points.
3. Matrix multiplication supports efficient transformations.
4. Probability describes uncertainty.
5. Derivatives measure local change.
6. Gradients guide parameter optimization.
7. A lower training loss does not automatically mean
   better performance on unseen data.
