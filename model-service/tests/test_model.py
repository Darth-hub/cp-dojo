import numpy as np

from app.model import (
    COLD_START_FLOOR,
    Attempt,
    Weights,
    average_tag_solve_rate,
    build_model,
    compute_tag_solve_rates,
    group_submissions_by_problem,
    label_attempts,
    predict_solve_probability,
    train_logistic_regression,
)
from tests.conftest import make_submission


class TestLabelAttempts:
    def test_first_try_accept_is_quick_solve(self):
        assert label_attempts([Attempt("OK", 10)]) == 1

    def test_accept_on_third_attempt_is_still_quick(self):
        attempts = [Attempt("WRONG_ANSWER", 1), Attempt("WRONG_ANSWER", 2), Attempt("OK", 3)]
        assert label_attempts(attempts) == 1

    def test_accept_on_fourth_attempt_is_a_grind(self):
        attempts = [Attempt("WRONG_ANSWER", t) for t in range(1, 4)] + [Attempt("OK", 4)]
        assert label_attempts(attempts) == 0

    def test_never_solved_is_zero(self):
        assert label_attempts([Attempt("TIME_LIMIT_EXCEEDED", 1), Attempt(None, 2)]) == 0

    def test_attempts_are_ordered_by_time_not_input_order(self):
        # Codeforces returns newest first; the OK here is chronologically 4th
        attempts = [
            Attempt("OK", 40),
            Attempt("WRONG_ANSWER", 30),
            Attempt("WRONG_ANSWER", 20),
            Attempt("WRONG_ANSWER", 10),
        ]
        assert label_attempts(attempts) == 0


class TestGrouping:
    def test_unrated_problems_are_skipped(self):
        submissions = [make_submission(1, "A", None, ["math"], "OK", 1)]
        assert group_submissions_by_problem(submissions) == {}

    def test_multiple_submissions_collapse_into_one_problem(self):
        submissions = [
            make_submission(1, "A", 800, ["math"], "WRONG_ANSWER", 1),
            make_submission(1, "A", 800, ["math"], "OK", 2),
            make_submission(1, "B", 1000, ["greedy"], "OK", 3),
        ]
        histories = group_submissions_by_problem(submissions)
        assert set(histories) == {"1_A", "1_B"}
        assert len(histories["1_A"].attempts) == 2


class TestTagSolveRates:
    def test_rate_is_quick_solves_over_total_per_tag(self):
        rates = compute_tag_solve_rates([(["dp", "math"], 1), (["dp"], 0), (["math"], 1)])
        assert rates == {"dp": 0.5, "math": 1.0}

    def test_average_ignores_unknown_tags_as_zero(self):
        assert average_tag_solve_rate(["dp", "unknown"], {"dp": 0.8}) == 0.4

    def test_average_of_no_tags_is_zero(self):
        assert average_tag_solve_rate([], {"dp": 0.8}) == 0.0


class TestTraining:
    def test_learns_that_harder_problems_are_less_likely_solved(self):
        rating_gaps = np.linspace(-2, 2, 200)
        features = np.column_stack([rating_gaps, np.full(200, 0.5)])
        labels = (rating_gaps < 0).astype(float)

        weights = train_logistic_regression(features, labels)

        assert weights.w1 < 0  # bigger gap above the user's rating -> lower probability

    def test_probability_is_monotone_in_problem_rating(self):
        weights = Weights(w0=0.2, w1=-1.5, w2=1.0)
        easy = predict_solve_probability(weights, {"dp": 0.5}, 1200, ["dp"], 1500)
        hard = predict_solve_probability(weights, {"dp": 0.5}, 1900, ["dp"], 1500)
        assert 0.0 < hard < easy < 1.0


class TestBuildModel:
    def test_returns_none_below_cold_start_floor(self):
        submissions = [
            make_submission(1, str(i), 800, ["math"], "OK", i) for i in range(COLD_START_FLOOR - 1)
        ]
        assert build_model(submissions, 1500) is None

    def test_trains_once_floor_is_reached(self):
        submissions = [
            make_submission(i, "A", 800 + 100 * i, ["math"], "OK" if i < 4 else "WRONG_ANSWER", i)
            for i in range(10)
        ]
        trained_model = build_model(submissions, 1200)

        assert trained_model is not None
        assert trained_model.training_examples == 10
        assert set(trained_model.tag_solve_rate) == {"math"}
