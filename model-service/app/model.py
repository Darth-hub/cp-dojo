"""Adaptive-difficulty model: pure functions, no I/O.

Port of the original TypeScript implementation (services/adaptiveDifficulty.service.ts
+ utils/logisticRegression.ts) so behaviour is unchanged after the move server-side:

* Each rated problem the user attempted becomes one training example.
* Label 1 = solved within QUICK_SOLVE_ATTEMPT_THRESHOLD attempts ("comfortable"),
  label 0 = solved after a grind, or never solved.
* Features: rating gap to the user's platform rating (in units of 400 Elo points)
  and the user's average solve rate on the problem's tags.
* Logistic regression trained with batch gradient descent.
"""

from dataclasses import dataclass

import numpy as np

COLD_START_FLOOR = 5
QUICK_SOLVE_ATTEMPT_THRESHOLD = 3
RATING_GAP_SCALE = 400.0
LEARNING_RATE = 0.1
EPOCHS = 500


@dataclass(frozen=True)
class Attempt:
    verdict: str | None
    creation_time_seconds: int


@dataclass
class ProblemHistory:
    rating: int
    tags: list[str]
    attempts: list[Attempt]


@dataclass(frozen=True)
class Weights:
    w0: float
    w1: float
    w2: float


@dataclass(frozen=True)
class TrainedModel:
    weights: Weights
    tag_solve_rate: dict[str, float]
    training_examples: int


def group_submissions_by_problem(submissions: list[dict]) -> dict[str, ProblemHistory]:
    """Collapse raw Codeforces submissions into one history per rated problem."""
    histories: dict[str, ProblemHistory] = {}

    for submission in submissions:
        problem = submission.get("problem", {})
        rating = problem.get("rating")
        if rating is None:
            continue

        problem_key = f"{problem.get('contestId')}_{problem.get('index')}"
        attempt = Attempt(
            verdict=submission.get("verdict"),
            creation_time_seconds=submission.get("creationTimeSeconds", 0),
        )

        if problem_key in histories:
            histories[problem_key].attempts.append(attempt)
        else:
            histories[problem_key] = ProblemHistory(
                rating=rating,
                tags=list(problem.get("tags", [])),
                attempts=[attempt],
            )

    return histories


def label_attempts(attempts: list[Attempt]) -> int:
    """1 if the first accepted submission came within the quick-solve threshold."""
    ordered_attempts = sorted(attempts, key=lambda attempt: attempt.creation_time_seconds)

    for attempt_number, attempt in enumerate(ordered_attempts, start=1):
        if attempt.verdict == "OK":
            return 1 if attempt_number <= QUICK_SOLVE_ATTEMPT_THRESHOLD else 0

    return 0


def compute_tag_solve_rates(labelled_problems: list[tuple[list[str], int]]) -> dict[str, float]:
    """Fraction of quick solves per tag, across all problems carrying that tag."""
    solved_per_tag: dict[str, int] = {}
    total_per_tag: dict[str, int] = {}

    for tags, label in labelled_problems:
        for tag in tags:
            total_per_tag[tag] = total_per_tag.get(tag, 0) + 1
            solved_per_tag[tag] = solved_per_tag.get(tag, 0) + label

    return {tag: solved_per_tag[tag] / total for tag, total in total_per_tag.items()}


def average_tag_solve_rate(tags: list[str], tag_solve_rate: dict[str, float]) -> float:
    if not tags:
        return 0.0
    return sum(tag_solve_rate.get(tag, 0.0) for tag in tags) / len(tags)


def sigmoid(values: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-values))


def train_logistic_regression(
    features: np.ndarray,
    labels: np.ndarray,
    learning_rate: float = LEARNING_RATE,
    epochs: int = EPOCHS,
) -> Weights:
    """Batch gradient descent on log-loss. features has shape (n, 2)."""
    example_count = features.shape[0]
    design_matrix = np.hstack([np.ones((example_count, 1)), features])
    weights = np.zeros(3)

    for _ in range(epochs):
        predictions = sigmoid(design_matrix @ weights)
        errors = predictions - labels
        gradient = design_matrix.T @ errors / example_count
        weights -= learning_rate * gradient

    return Weights(w0=float(weights[0]), w1=float(weights[1]), w2=float(weights[2]))


def predict_solve_probability(
    weights: Weights,
    tag_solve_rate: dict[str, float],
    problem_rating: int,
    problem_tags: list[str],
    platform_rating: int,
) -> float:
    rating_gap = (problem_rating - platform_rating) / RATING_GAP_SCALE
    tag_rate = average_tag_solve_rate(problem_tags, tag_solve_rate)
    linear_score = weights.w0 + weights.w1 * rating_gap + weights.w2 * tag_rate
    return float(sigmoid(np.array(linear_score)))


def build_model(submissions: list[dict], platform_rating: int) -> TrainedModel | None:
    """Train a per-user model, or return None below the cold-start floor."""
    histories = group_submissions_by_problem(submissions)
    if len(histories) < COLD_START_FLOOR:
        return None

    labelled_problems = [
        (history.rating, history.tags, label_attempts(history.attempts)) for history in histories.values()
    ]
    tag_solve_rate = compute_tag_solve_rates([(tags, label) for _, tags, label in labelled_problems])

    features = np.array(
        [
            [
                (rating - platform_rating) / RATING_GAP_SCALE,
                average_tag_solve_rate(tags, tag_solve_rate),
            ]
            for rating, tags, _ in labelled_problems
        ]
    )
    labels = np.array([label for _, _, label in labelled_problems], dtype=float)

    weights = train_logistic_regression(features, labels)
    return TrainedModel(
        weights=weights,
        tag_solve_rate=tag_solve_rate,
        training_examples=len(labelled_problems),
    )
