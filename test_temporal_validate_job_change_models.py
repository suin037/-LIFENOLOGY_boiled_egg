import unittest

import pandas as pd

from temporal_validate_job_change_models import temporal_split, verdict


class TemporalValidationTest(unittest.TestCase):
    def test_strict_temporal_split_removes_prior_people(self):
        df = pd.DataFrame({
            "pid": [1, 2, 1, 3], "year_t": [2020, 2020, 2022, 2022],
        })
        train, test = temporal_split(df, 2021, strict_people=True)
        self.assertEqual(set(train.pid), {1, 2})
        self.assertEqual(set(test.pid), {3})

    def test_verdict_requires_positive_ci_and_overlap(self):
        base = {"overlap_fraction": 0.9, "adjusted_effect_move_minus_stay": 1.0}
        self.assertEqual(verdict({**base, "cluster_bootstrap_ci95": [0.1, 2.0]}), "시간 검증 통과")
        self.assertEqual(verdict({**base, "cluster_bootstrap_ci95": [-0.1, 2.0]}), "방향만 유지")
        self.assertEqual(verdict({**base, "overlap_fraction": 0.7, "cluster_bootstrap_ci95": [0.1, 2.0]}), "overlap 부족")


if __name__ == "__main__":
    unittest.main()
